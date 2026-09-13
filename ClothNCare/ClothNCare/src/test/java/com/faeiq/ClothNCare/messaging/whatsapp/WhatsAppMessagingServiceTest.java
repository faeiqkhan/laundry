package com.faeiq.ClothNCare.messaging.whatsapp;

import com.faeiq.ClothNCare.messaging.PhoneNumberUtil;
import com.faeiq.ClothNCare.messaging.whatsapp.WhatsAppConnectionStatus;
import com.faeiq.ClothNCare.messaging.whatsapp.WhatsAppDeliveryResult;
import com.faeiq.ClothNCare.messaging.whatsapp.WhatsAppMessageLog;
import com.faeiq.ClothNCare.messaging.whatsapp.WhatsAppMessageLogRepository;
import com.faeiq.ClothNCare.messaging.whatsapp.WhatsAppMessageRequest;
import com.faeiq.ClothNCare.messaging.whatsapp.WhatsAppMessageStatus;
import com.faeiq.ClothNCare.messaging.whatsapp.WhatsAppMessagingService;
import com.faeiq.ClothNCare.messaging.whatsapp.WhatsAppProperties;
import com.faeiq.ClothNCare.messaging.whatsapp.WhatsAppProvider;
import com.faeiq.ClothNCare.messaging.whatsapp.WhatsAppProviderState;
import com.faeiq.ClothNCare.messaging.whatsapp.WhatsAppSendResult;
import com.faeiq.ClothNCare.settings.entity.AppSettings;
import com.faeiq.ClothNCare.settings.repository.AppSettingsRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class WhatsAppMessagingServiceTest {

    private AppSettingsRepository settingsRepository;
    private WhatsAppMessageLogRepository logRepository;
    private WhatsAppProperties properties;
    private FakeProvider provider;

    private WhatsAppMessagingService service;

    private AppSettings settings(boolean enabled) {
        AppSettings settings = new AppSettings();
        settings.setWhatsAppEnabled(enabled);
        settings.setWhatsAppProvider("webjs");
        settings.setWhatsAppTestMode(false);
        return settings;
    }

    @BeforeEach
    void setUp() {
        settingsRepository = mock(AppSettingsRepository.class);
        logRepository = mock(WhatsAppMessageLogRepository.class);
        when(logRepository.save(any(WhatsAppMessageLog.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        properties = new WhatsAppProperties();
        properties.setMaxRetries(3);
        properties.setDefaultCountry("IN");

        provider = new FakeProvider("webjs");
        service = new WhatsAppMessagingService(settingsRepository, logRepository, properties,
                List.of(provider));
    }

    @Test
    void disabledProviderRecordsSkipped() {
        when(settingsRepository.findById(1L)).thenReturn(Optional.of(settings(false)));

        WhatsAppMessageLog log = service.submit(request("9876543210", "hello"));

        assertEquals(WhatsAppMessageStatus.SKIPPED, log.getStatus());
        assertEquals("WhatsApp is disabled", log.getFailureReason());
    }

    @Test
    void invalidPhoneRecordsFailedWithoutProviderCall() {
        when(settingsRepository.findById(1L)).thenReturn(Optional.of(settings(true)));

        WhatsAppMessageLog log = service.submit(request("12", "hello"));

        assertEquals(WhatsAppMessageStatus.FAILED, log.getStatus());
        assertTrue(log.getFailureReason().contains("Invalid phone"));
        assertEquals(0, provider.textCalls);
    }

    @Test
    void validSubmissionIsQueued() {
        when(settingsRepository.findById(1L)).thenReturn(Optional.of(settings(true)));
        when(logRepository.existsByBusinessKeyAndStatusIn(anyString(), any())).thenReturn(false);

        WhatsAppMessageLog log = service.submit(request("9876543210", "hello"));

        assertEquals(WhatsAppMessageStatus.QUEUED, log.getStatus());
        assertEquals("919876543210", log.getToPhone());
        assertNotNull(log.getNextRetryAt());
    }

    @Test
    void duplicateBusinessKeyIsNotRecordedTwice() {
        when(settingsRepository.findById(1L)).thenReturn(Optional.of(settings(true)));
        when(logRepository.existsByBusinessKeyAndStatusIn("ORDER:42:READY", List.of(
                WhatsAppMessageStatus.QUEUED, WhatsAppMessageStatus.SENDING,
                WhatsAppMessageStatus.SENT))).thenReturn(true);
        WhatsAppMessageLog existing = new WhatsAppMessageLog();
        existing.setId("existing");
        when(logRepository.findFirstByBusinessKeyOrderBySentAtDesc("ORDER:42:READY"))
                .thenReturn(Optional.of(existing));

        WhatsAppMessageRequest request = request("9876543210", "hello");
        request.setBusinessKey("ORDER:42:READY");

        WhatsAppMessageLog result = service.submit(request);

        assertEquals("existing", result.getId());
    }

    @Test
    void testModeRedirectsRecipient() {
        AppSettings settings = settings(true);
        settings.setWhatsAppTestMode(true);
        settings.setWhatsAppTestNumber("911111111111");
        when(settingsRepository.findById(1L)).thenReturn(Optional.of(settings));
        when(logRepository.existsByBusinessKeyAndStatusIn(anyString(), any())).thenReturn(false);

        WhatsAppMessageLog log = service.submit(request("9876543210", "hello"));

        assertEquals("91" + "1111111111", log.getToPhone());
    }

    @Test
    void deliverDueSendsQueuedMessages() {
        when(settingsRepository.findById(1L)).thenReturn(Optional.of(settings(true)));
        provider.result = WhatsAppSendResult.ok("wa-msg-1", "webjs");

        WhatsAppMessageLog queued = new WhatsAppMessageLog();
        queued.setId("m1");
        queued.setStatus(WhatsAppMessageStatus.QUEUED);
        queued.setToPhone("919876543210");
        queued.setBody("hello");
        queued.setNextRetryAt(LocalDateTime.now().minusSeconds(5));
        queued.setAttemptCount(0);

        when(logRepository.findByStatusInOrderByNextRetryAtAsc(List.of(WhatsAppMessageStatus.QUEUED)))
                .thenReturn(List.of(queued));
        when(logRepository.findByStatusInOrderByNextRetryAtAsc(List.of(WhatsAppMessageStatus.FAILED)))
                .thenReturn(List.of());

        int delivered = service.deliverDue();

        assertEquals(1, delivered);
        assertEquals(1, provider.textCalls);
        assertEquals(WhatsAppMessageStatus.SENT, queued.getStatus());
        assertEquals("wa-msg-1", queued.getProviderMessageId());
    }

    @Test
    void exhaustedRetriesCancelMessage() {
        when(settingsRepository.findById(1L)).thenReturn(Optional.of(settings(true)));
        provider.result = WhatsAppSendResult.fail("webjs", "WhatsApp is not connected yet - scan the QR code first.", true);
        properties.setMaxRetries(1);

        WhatsAppMessageLog failed = new WhatsAppMessageLog();
        failed.setId("m2");
        failed.setStatus(WhatsAppMessageStatus.QUEUED);
        failed.setToPhone("919876543210");
        failed.setBody("hello");
        failed.setNextRetryAt(LocalDateTime.now().minusSeconds(5));
        failed.setAttemptCount(0);

        when(logRepository.findByStatusInOrderByNextRetryAtAsc(List.of(WhatsAppMessageStatus.QUEUED)))
                .thenReturn(List.of(failed));
        when(logRepository.findByStatusInOrderByNextRetryAtAsc(List.of(WhatsAppMessageStatus.FAILED)))
                .thenReturn(List.of());

        service.deliverDue();

        assertEquals(1, failed.getAttemptCount());
        assertEquals(WhatsAppMessageStatus.CANCELLED, failed.getStatus());
    }

    @Test
    void nonRetryableFailureCancelsImmediately() {
        when(settingsRepository.findById(1L)).thenReturn(Optional.of(settings(true)));
        provider.result = WhatsAppSendResult.fail("webjs", "Number 919876543210 is not registered on WhatsApp", false);

        WhatsAppMessageLog failed = new WhatsAppMessageLog();
        failed.setId("m3");
        failed.setStatus(WhatsAppMessageStatus.QUEUED);
        failed.setToPhone("919876543210");
        failed.setBody("hello");
        failed.setNextRetryAt(LocalDateTime.now().minusSeconds(5));
        failed.setAttemptCount(0);

        when(logRepository.findByStatusInOrderByNextRetryAtAsc(List.of(WhatsAppMessageStatus.QUEUED)))
                .thenReturn(List.of(failed));
        when(logRepository.findByStatusInOrderByNextRetryAtAsc(List.of(WhatsAppMessageStatus.FAILED)))
                .thenReturn(List.of());

        service.deliverDue();

        assertEquals(WhatsAppMessageStatus.CANCELLED, failed.getStatus());
        assertNull(failed.getNextRetryAt());
    }

    @Test
    void manualSendReturnsSuccessAndPersistsSent() {
        when(settingsRepository.findById(1L)).thenReturn(Optional.of(settings(true)));
        provider.result = WhatsAppSendResult.ok("wa-msg-9", "webjs");

        WhatsAppMessageRequest request = new WhatsAppMessageRequest(WhatsAppMessageStatus.CAT_MANUAL,
                "9876543210", "manual hello");

        WhatsAppDeliveryResult result = service.sendManual(request);

        assertTrue(result.isSuccess());
        assertEquals(WhatsAppMessageStatus.SENT, result.getStatus());
        assertEquals(1, provider.textCalls);
    }

    @Test
    void manualSendWhileDisabledIsSkipped() {
        when(settingsRepository.findById(1L)).thenReturn(Optional.of(settings(false)));

        WhatsAppDeliveryResult result = service.sendManual(
                new WhatsAppMessageRequest(WhatsAppMessageStatus.CAT_MANUAL, "9876543210", "hi"));

        assertFalse(result.isSuccess());
        assertEquals(WhatsAppMessageStatus.SKIPPED, result.getStatus());
        assertEquals("WhatsApp is disabled in settings", result.getMessage());
    }

    @Test
    void activeProviderFollowsSettings() {
        FakeProvider cloud = new FakeProvider("cloudapi");
        service = new WhatsAppMessagingService(settingsRepository, logRepository, properties,
                List.of(provider, cloud));

        AppSettings settings = settings(true);
        settings.setWhatsAppProvider("cloudapi");
        when(settingsRepository.findById(1L)).thenReturn(Optional.of(settings));

        WhatsAppProvider active = service.activeProvider();

        assertEquals("cloudapi", active.name());
    }

    @Test
    void connectionStatusReflectsProvider() {
        when(settingsRepository.findById(1L)).thenReturn(Optional.of(settings(true)));
        provider.statusResult = WhatsAppConnectionStatus.of(WhatsAppProviderState.CONNECTED);
        provider.healthy = true;

        WhatsAppConnectionStatus status = service.connectionStatus();

        assertTrue(status.isConnected());
        assertEquals(WhatsAppProviderState.CONNECTED, status.getState());
    }

    @Test
    void retryMessageRequeuesEntry() {
        WhatsAppMessageLog cancelled = new WhatsAppMessageLog();
        cancelled.setId("m4");
        cancelled.setStatus(WhatsAppMessageStatus.CANCELLED);
        cancelled.setAttemptCount(3);
        when(logRepository.findById("m4")).thenReturn(Optional.of(cancelled));

        WhatsAppMessageLog result = service.retryMessage("m4");

        assertEquals(WhatsAppMessageStatus.QUEUED, result.getStatus());
        assertEquals(0, result.getAttemptCount());
        assertNotNull(result.getNextRetryAt());
    }

    private WhatsAppMessageRequest request(String to, String body) {
        return new WhatsAppMessageRequest(WhatsAppMessageStatus.CAT_MANUAL, to, body);
    }

    private static class FakeProvider implements WhatsAppProvider {

        private final String name;
        private WhatsAppSendResult result = WhatsAppSendResult.fail("webjs", "not ready", true);
        private WhatsAppConnectionStatus statusResult =
                WhatsAppConnectionStatus.of(WhatsAppProviderState.DISCONNECTED);
        private boolean healthy = true;
        private int textCalls = 0;

        FakeProvider(String name) {
            this.name = name;
        }

        @Override
        public String name() {
            return name;
        }

        @Override
        public boolean isConfigured() {
            return true;
        }

        @Override
        public boolean isHealthy() {
            return healthy;
        }

        @Override
        public WhatsAppConnectionStatus status() {
            return statusResult;
        }

        @Override
        public WhatsAppSendResult sendText(WhatsAppMessageRequest request) {
            textCalls++;
            return result;
        }

        @Override
        public WhatsAppSendResult sendDocument(WhatsAppDocumentRequest request) {
            return result;
        }

        @Override
        public void connect() {
        }

        @Override
        public void reconnect() {
        }

        @Override
        public void logout() {
        }
    }
}