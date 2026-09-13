package com.faeiq.ClothNCare.messaging.whatsapp;

import com.faeiq.ClothNCare.messaging.PhoneNumberUtil;
import com.faeiq.ClothNCare.settings.entity.AppSettings;
import com.faeiq.ClothNCare.settings.repository.AppSettingsRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Provider-agnostic WhatsApp outbound facade. Queues notifications (with
 * deduplication), drives delivery/retry via a scheduled poller, and executes
 * explicit manual sends (invoice documents, ad-hoc messages) synchronously.
 */
@Service
public class WhatsAppMessagingService {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppMessagingService.class);

    private final AppSettingsRepository settingsRepository;
    private final WhatsAppMessageLogRepository logRepository;
    private final WhatsAppProperties properties;
    private final List<WhatsAppProvider> providers;

    public WhatsAppMessagingService(AppSettingsRepository settingsRepository,
                                    WhatsAppMessageLogRepository logRepository,
                                    WhatsAppProperties properties,
                                    List<WhatsAppProvider> providers) {
        this.settingsRepository = settingsRepository;
        this.logRepository = logRepository;
        this.properties = properties;
        this.providers = providers;
    }

    public boolean isEnabled() {
        AppSettings settings = settingsRepository.findById(1L).orElse(null);
        return settings != null && settings.isWhatsAppEnabled();
    }

    public WhatsAppProvider activeProvider() {
        AppSettings settings = settingsRepository.findById(1L).orElse(null);
        String selected = settings != null && settings.getWhatsAppProvider() != null
                ? settings.getWhatsAppProvider() : "webjs";
        for (WhatsAppProvider provider : providers) {
            if (provider.name().equalsIgnoreCase(selected)) {
                return provider;
            }
        }
        return providers.isEmpty() ? null : providers.get(0);
    }

    /**
     * Enqueue a message for asynchronous delivery. Returns the persisted log,
     * an already-existing duplicate, or null when the message was skipped
     * silently. Never throws for WhatsApp problems.
     */
    @Transactional
    public WhatsAppMessageLog submit(WhatsAppMessageRequest request) {
        AppSettings settings = settingsRepository.findById(1L).orElse(null);
        if (settings == null) {
            return null;
        }
        String destination = resolveRecipient(settings, request.getTo());
        String businessKey = request.getBusinessKey();

        boolean duplicate = businessKey != null && !businessKey.isBlank()
                && logRepository.existsByBusinessKeyAndStatusIn(businessKey,
                List.of(WhatsAppMessageStatus.QUEUED, WhatsAppMessageStatus.SENDING,
                        WhatsAppMessageStatus.SENT));
        if (duplicate) {
            return logRepository.findFirstByBusinessKeyOrderBySentAtDesc(businessKey).orElse(null);
        }

        if (!settings.isWhatsAppEnabled()) {
            return record(settings, request, destination, WhatsAppMessageStatus.SKIPPED, null, null,
                    "WhatsApp is disabled");
        }

        if (destination == null) {
            return record(settings, request, request.getTo(), WhatsAppMessageStatus.FAILED, null, null,
                    "Invalid phone number: " + request.getTo());
        }

        if (request.getBody() == null || request.getBody().isBlank()) {
            return record(settings, request, destination, WhatsAppMessageStatus.FAILED, null, null,
                    "Message body is empty");
        }

        return record(settings, request, destination, WhatsAppMessageStatus.QUEUED, null, null, null);
    }

    /**
     * Deliver all QUEUED messages and retry FAILED messages whose retry window
     * has passed. Messages that exhaust the retry budget are cancelled.
     */
    @Scheduled(fixedDelayString = "${whatsapp.delivery-poll-interval-ms:30000}")
    @Transactional
    public int deliverDue() {
        if (!isEnabled()) {
            return 0;
        }
        WhatsAppProvider provider = activeProvider();
        if (provider == null) {
            return 0;
        }

        List<WhatsAppMessageLog> due = new ArrayList<>(
                logRepository.findByStatusInOrderByNextRetryAtAsc(List.of(WhatsAppMessageStatus.QUEUED)));

        LocalDateTime now = LocalDateTime.now();
        if (properties.getMaxRetries() > 0) {
            for (WhatsAppMessageLog entry : logRepository.findByStatusInOrderByNextRetryAtAsc(
                    List.of(WhatsAppMessageStatus.FAILED))) {
                int attempts = entry.getAttemptCount() == null ? 0 : entry.getAttemptCount();
                if (attempts < properties.getMaxRetries()
                        && (entry.getNextRetryAt() == null || !entry.getNextRetryAt().isAfter(now))) {
                    due.add(entry);
                } else if (attempts >= properties.getMaxRetries()) {
                    entry.setStatus(WhatsAppMessageStatus.CANCELLED);
                    logRepository.save(entry);
                }
            }
        }

        for (WhatsAppMessageLog entry : due) {
            attemptSend(entry, provider);
        }
        return due.size();
    }

    /**
     * Synchronously send a manual (explicit) text message and persist the
     * result. Used by admin actions and the test UI.
     */
    @Transactional
    public WhatsAppDeliveryResult sendManual(WhatsAppMessageRequest request) {
        AppSettings settings = settingsRepository.findById(1L).orElse(null);
        if (settings == null || !settings.isWhatsAppEnabled()) {
            return result(false, null, WhatsAppMessageStatus.SKIPPED, null, null,
                    "WhatsApp is disabled in settings", false, null, null);
        }
        if (request.getCategory() == null || request.getCategory().isBlank()) {
            request.setCategory(WhatsAppMessageStatus.CAT_MANUAL);
        }
        String destination = resolveRecipient(settings, request.getTo());
        if (destination == null) {
            return result(false, null, WhatsAppMessageStatus.FAILED, null, null,
                    "Invalid phone number: " + request.getTo(), false, null, null);
        }
        request.setTo(destination);
        return doSyncSend(request, settings);
    }

    /**
     * Synchronously send an invoice PDF to the order's customer WhatsApp.
     */
    @Transactional
    public WhatsAppDeliveryResult sendInvoiceDocument(WhatsAppDocumentRequest request, AppSettings settings) {
        if (settings == null || !settings.isWhatsAppEnabled()) {
            return result(false, null, WhatsAppMessageStatus.SKIPPED, null, null,
                    "WhatsApp is disabled in settings", false, null, null);
        }
        String destination = resolveRecipient(settings, request.getTo());
        if (destination == null) {
            return result(false, null, WhatsAppMessageStatus.FAILED, null, null,
                    "Invalid phone number: " + request.getTo(), false, null, null);
        }
        request.setTo(destination);

        WhatsAppProvider provider = activeProvider();
        WhatsAppSendResult send = null;
        String lastFailure = null;
        try {
            if (provider == null) {
                lastFailure = "No WhatsApp provider configured";
            } else {
                send = provider.sendDocument(request);
            }
        } catch (Exception e) {
            lastFailure = e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
            log.error("WhatsApp document send error: {}", lastFailure);
        }
        boolean ok = send != null && send.isSuccess();
        String status = ok ? WhatsAppMessageStatus.SENT : WhatsAppMessageStatus.FAILED;
        record(settings, request, request.getTo(), status,
                ok ? send.getProviderMessageId() : null,
                ok ? send.getProvider() : (provider != null ? provider.name() : null),
                ok ? null : (send != null ? send.getFailureReason() : lastFailure));
        return result(ok, null, status, ok ? send.getProviderMessageId() : null,
                ok ? send.getProvider() : null,
                ok ? "Invoice sent" : (send != null ? send.getFailureReason() : lastFailure),
                ok ? true : (send == null || send.isRetryable()),
                request.getOrderId(), request.getInvoiceId());
    }

    private WhatsAppDeliveryResult doSyncSend(WhatsAppMessageRequest request, AppSettings settings) {
        WhatsAppProvider provider = activeProvider();
        WhatsAppSendResult send = null;
        String lastFailure = null;
        if (request.getBody() == null || request.getBody().isBlank()) {
            lastFailure = "Message body is empty";
        }
        try {
            if (lastFailure == null && provider == null) {
                lastFailure = "No WhatsApp provider configured";
            } else if (lastFailure == null) {
                send = provider.sendText(request);
            }
        } catch (Exception e) {
            lastFailure = e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
            log.error("WhatsApp manual send error: {}", lastFailure);
        }
        boolean ok = send != null && send.isSuccess();
        String status = ok ? WhatsAppMessageStatus.SENT : WhatsAppMessageStatus.FAILED;
        record(settings, request, request.getTo(), status,
                ok ? send.getProviderMessageId() : null,
                ok ? send.getProvider() : (provider != null ? provider.name() : null),
                ok ? null : (send != null ? send.getFailureReason() : lastFailure));
        return result(ok, null, status, ok ? send.getProviderMessageId() : null,
                ok ? send.getProvider() : provider != null ? provider.name() : null,
                ok ? "Message sent" : (send != null ? send.getFailureReason() : lastFailure),
                ok ? true : (send == null || send.isRetryable()),
                request.getOrderId(), request.getInvoiceId());
    }

    public WhatsAppConnectionStatus connectionStatus() {
        WhatsAppProvider provider = activeProvider();
        if (provider == null) {
            WhatsAppConnectionStatus status = WhatsAppConnectionStatus.of(WhatsAppProviderState.NOT_CONFIGURED);
            status.setMessage("No WhatsApp provider is registered");
            return status;
        }
        WhatsAppConnectionStatus status = provider.status();
        status.setConfigured(provider.isConfigured());
        status.setConnected(status.getState() == WhatsAppProviderState.CONNECTED && provider.isHealthy());
        if (!provider.isHealthy()) {
            status.setState(WhatsAppProviderState.OFFLINE);
            status.setConnected(false);
            status.setMessage("WhatsApp service is offline");
        }
        return status;
    }

    public void connect() {
        WhatsAppProvider provider = activeProvider();
        if (provider != null) {
            provider.connect();
        }
    }

    public void reconnect() {
        WhatsAppProvider provider = activeProvider();
        if (provider != null) {
            provider.reconnect();
        }
    }

    public void logout() {
        WhatsAppProvider provider = activeProvider();
        if (provider != null) {
            provider.logout();
        }
    }

    @Transactional
    public WhatsAppMessageLog retryMessage(String id) {
        WhatsAppMessageLog entry = logRepository.findById(id).orElse(null);
        if (entry == null) {
            return null;
        }
        entry.setStatus(WhatsAppMessageStatus.QUEUED);
        entry.setAttemptCount(0);
        entry.setFailureReason(null);
        entry.setNextRetryAt(LocalDateTime.now());
        return logRepository.save(entry);
    }

    private void attemptSend(WhatsAppMessageLog entry, WhatsAppProvider provider) {
        entry.setStatus(WhatsAppMessageStatus.SENDING);
        entry.setLastAttemptAt(LocalDateTime.now());
        logRepository.save(entry);

        WhatsAppMessageRequest request = new WhatsAppMessageRequest();
        request.setCategory(entry.getCategory());
        request.setTo(entry.getToPhone());
        request.setBody(entry.getBody());
        request.setTemplateName(entry.getTemplateName());

        WhatsAppSendResult send = null;
        String lastFailure = null;
        try {
            if (provider == null) {
                lastFailure = "No WhatsApp provider configured";
            } else {
                send = provider.sendText(request);
            }
        } catch (Exception e) {
            lastFailure = e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
        }

        int attempts = (entry.getAttemptCount() == null ? 0 : entry.getAttemptCount()) + 1;
        entry.setAttemptCount(attempts);

        if (send != null && send.isSuccess()) {
            entry.setStatus(WhatsAppMessageStatus.SENT);
            entry.setSentAt(LocalDateTime.now());
            entry.setProvider(send.getProvider());
            entry.setProviderMessageId(send.getProviderMessageId());
            entry.setFailureReason(null);
            entry.setNextRetryAt(null);
            log.info("WhatsApp message {} sent to {} via {}", entry.getId(), entry.getToPhone(), send.getProvider());
        } else {
            String reason = send != null ? send.getFailureReason() : lastFailure;
            boolean retryable = send == null || send.isRetryable();
            if (!retryable || attempts >= properties.getMaxRetries()) {
                entry.setStatus(WhatsAppMessageStatus.CANCELLED);
                entry.setNextRetryAt(null);
                log.warn("WhatsApp message {} cancelled (reason: {}, attempts: {})",
                        entry.getId(), reason, attempts);
            } else {
                entry.setStatus(WhatsAppMessageStatus.FAILED);
                entry.setNextRetryAt(LocalDateTime.now().plusSeconds(backoffSeconds(attempts)));
            }
            entry.setFailureReason(reason);
        }
        logRepository.save(entry);
    }

    private long backoffSeconds(int attemptCount) {
        long base = properties.getDeliveryPollIntervalMs() / 1000L;
        return Math.max(30, base * (1L << Math.min(attemptCount - 1, 3)));
    }

    private WhatsAppMessageLog record(AppSettings settings, WhatsAppMessageRequest request, String destination,
                                      String status, String providerMessageId, String provider,
                                      String failureReason) {
        WhatsAppMessageLog entry = new WhatsAppMessageLog();
        fill(entry, request.getCategory(), request.getTo(), request.getBody(), request.getTemplateName(),
                request.getBusinessKey(), request.getMessageType(), request.getCustomerId(),
                request.getOrderId(), request.getInvoiceId());
        return persist(entry, settings, destination, status, providerMessageId, provider, failureReason);
    }

    private WhatsAppMessageLog record(AppSettings settings, WhatsAppDocumentRequest request, String destination,
                                      String status, String providerMessageId, String provider,
                                      String failureReason) {
        WhatsAppMessageLog entry = new WhatsAppMessageLog();
        fill(entry, request.getCategory(), request.getTo(), request.getBody(), null,
                request.getBusinessKey(), request.getMessageType(), request.getCustomerId(),
                request.getOrderId(), request.getInvoiceId());
        return persist(entry, settings, destination, status, providerMessageId, provider, failureReason);
    }

    private void fill(WhatsAppMessageLog entry, String category, String to, String body, String templateName,
                      String businessKey, String messageType, String customerId, String orderId, String invoiceId) {
        entry.setToPhone(to);
        entry.setCategory(category);
        entry.setBody(body);
        entry.setTemplateName(templateName);
        entry.setBusinessKey(businessKey);
        entry.setMessageType(messageType);
        entry.setCustomerId(customerId);
        entry.setOrderId(orderId);
        entry.setInvoiceId(invoiceId);
    }

    private WhatsAppMessageLog persist(WhatsAppMessageLog entry, AppSettings settings, String destination,
                                       String status, String providerMessageId, String provider,
                                       String failureReason) {
        entry.setToPhone(destination == null ? strip(entry.getToPhone()) : destination);
        entry.setStatus(status);
        entry.setProvider(provider);
        entry.setProviderMessageId(providerMessageId);
        entry.setFailureReason(failureReason);
        entry.setAttemptCount(0);
        entry.setSentAt(LocalDateTime.now());
        if (WhatsAppMessageStatus.QUEUED.equals(status)) {
            entry.setNextRetryAt(LocalDateTime.now());
        }
        return logRepository.save(entry);
    }

    private String resolveRecipient(AppSettings settings, String rawTo) {
        boolean testMode = properties.getTestMode() != null ? properties.getTestMode()
                : settings.isWhatsAppTestMode();
        String candidate = rawTo;
        if (testMode) {
            String testNumber = properties.getTestNumber() != null && !properties.getTestNumber().isBlank()
                    ? properties.getTestNumber() : settings.getWhatsAppTestNumber();
            if (testNumber != null && !testNumber.isBlank()) {
                log.info("WhatsApp TEST_MODE: redirecting message for {} to test number {}", rawTo, testNumber);
                candidate = testNumber;
            }
        }
        return PhoneNumberUtil.toE164(candidate, properties.getDefaultCountry());
    }

    private WhatsAppDeliveryResult result(boolean success, String messageLogId, String status,
                                          String providerMessageId, String provider, String message,
                                          boolean retryable, String orderId, String invoiceId) {
        return new WhatsAppDeliveryResult(success, messageLogId, status, providerMessageId, provider,
                message, retryable, orderId, invoiceId);
    }

    private String strip(String value) {
        return value == null ? "" : value;
    }
}