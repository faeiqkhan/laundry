package com.faeiq.ClothNCare.messaging.whatsapp;

import com.faeiq.ClothNCare.settings.entity.AppSettings;
import com.faeiq.ClothNCare.settings.repository.AppSettingsRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class WhatsAppService {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppService.class);
    private static final String GRAPH_URL = "https://graph.facebook.com/v19.0";
    private static final String DEFAULT_COUNTRY_CODE = "91";

    public static final String MODE_FREE_FORM = "FREE_FORM";
    public static final String MODE_TEMPLATE = "TEMPLATE";

    public static final String CAT_WELCOME = "WELCOME";
    public static final String CAT_INVOICE = "INVOICE";
    public static final String CAT_STATUS = "STATUS";

    private static final String STATUS_SENT = "SENT";
    private static final String STATUS_FAILED = "FAILED";
    private static final String STATUS_SKIPPED = "SKIPPED";

    private final AppSettingsRepository settingsRepository;
    private final WhatsAppMessageLogRepository logRepository;
    private final RestClient restClient;

    public WhatsAppService(AppSettingsRepository settingsRepository,
                           WhatsAppMessageLogRepository logRepository) {
        this.settingsRepository = settingsRepository;
        this.logRepository = logRepository;
        this.restClient = RestClient.create();
    }

    public boolean isConfigured() {
        AppSettings settings = settingsRepository.findById(1L).orElse(null);
        return settings != null
                && settings.isWhatsAppEnabled()
                && isNotBlank(settings.getWhatsAppPhoneNumberId())
                && isNotBlank(settings.getWhatsAppAccessToken());
    }

    public boolean send(String category, String to, String freeFormBody,
                        String templateName, List<String> templateParams) {
        AppSettings settings = settingsRepository.findById(1L).orElse(null);
        if (!isConfigured()) {
            logOutcome(category, to, freeFormBody, templateName, STATUS_SKIPPED);
            log.info("WhatsApp disabled or not configured; message to {} was not sent", to);
            return false;
        }

        boolean useTemplate = MODE_TEMPLATE.equalsIgnoreCase(settings.getWhatsAppMode())
                && isNotBlank(templateName);
        boolean ok = useTemplate
                ? sendTemplate(settings, to, templateName, templateParams)
                : sendFreeForm(settings, to, freeFormBody);
        logOutcome(category, to, freeFormBody, templateName, ok ? STATUS_SENT : STATUS_FAILED);
        return ok;
    }

    public boolean sendFreeForm(AppSettings settings, String to, String body) {
        if (isBlank(to) || isBlank(body)) {
            return false;
        }
        try {
            Map<String, Object> payload = Map.of(
                    "messaging_product", "whatsapp",
                    "to", normalize(to),
                    "type", "text",
                    "text", Map.of("body", body));

            restClient.post()
                    .uri(GRAPH_URL + "/" + settings.getWhatsAppPhoneNumberId() + "/messages")
                    .header("Authorization", "Bearer " + settings.getWhatsAppAccessToken())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();

            log.info("WhatsApp text message sent to {}", to);
            return true;
        } catch (Exception e) {
            log.error("WhatsApp text message failed for {}: {}", to, e.getMessage());
            return false;
        }
    }

    public boolean sendTemplate(AppSettings settings, String to, String templateName, List<String> params) {
        if (isBlank(to) || isBlank(templateName)) {
            return false;
        }
        try {
            Map<String, Object> template = new HashMap<>();
            template.put("name", templateName);
            template.put("language", Map.of("code", "en"));
            if (params != null && !params.isEmpty()) {
                template.put("components", List.of(Map.of(
                        "type", "body",
                        "parameters", params.stream()
                                .map(p -> (Object) Map.of("type", "text", "text", p))
                                .toList())));
            }

            Map<String, Object> payload = Map.of(
                    "messaging_product", "whatsapp",
                    "to", normalize(to),
                    "type", "template",
                    "template", template);

            restClient.post()
                    .uri(GRAPH_URL + "/" + settings.getWhatsAppPhoneNumberId() + "/messages")
                    .header("Authorization", "Bearer " + settings.getWhatsAppAccessToken())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();

            log.info("WhatsApp template message '{}' sent to {}", templateName, to);
            return true;
        } catch (Exception e) {
            log.error("WhatsApp template message '{}' failed for {}: {}", templateName, to, e.getMessage());
            return false;
        }
    }

    public List<WhatsAppMessageLog> getMessageHistory(String phone) {
        if (isNotBlank(phone)) {
            return logRepository.findAllByToPhoneContainingIgnoreCaseOrderBySentAtDesc(phone);
        }
        return logRepository.findAllByOrderBySentAtDesc();
    }

    private void logOutcome(String category, String to, String body,
                            String templateName, String status) {
        try {
            WhatsAppMessageLog entry = new WhatsAppMessageLog();
            entry.setToPhone(to == null ? "" : to);
            entry.setCategory(category == null ? "" : category);
            entry.setStatus(status);
            entry.setBody(body);
            entry.setTemplateName(templateName);
            entry.setSentAt(java.time.LocalDateTime.now());
            logRepository.save(entry);
        } catch (Exception e) {
            log.warn("Failed to persist WhatsApp message log: {}", e.getMessage());
        }
    }

    public String normalize(String phone) {
        String digits = phone == null ? "" : phone.replaceAll("[^0-9]", "");
        if (digits.length() == 10) {
            return DEFAULT_COUNTRY_CODE + digits;
        }
        if (digits.length() == 11 && digits.startsWith("0")) {
            return DEFAULT_COUNTRY_CODE + digits.substring(1);
        }
        if (digits.length() == 12 && digits.startsWith(DEFAULT_COUNTRY_CODE)) {
            return digits;
        }
        return digits;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private boolean isNotBlank(String value) {
        return !isBlank(value);
    }
}