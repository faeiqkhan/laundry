package com.faeiq.ClothNCare.messaging.whatsapp;

import com.faeiq.ClothNCare.messaging.PhoneNumberUtil;
import com.faeiq.ClothNCare.settings.entity.AppSettings;
import com.faeiq.ClothNCare.settings.repository.AppSettingsRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * WhatsApp Cloud API provider (graph.facebook.com). Preserves the previous
 * shipped implementation behind the WhatsAppProvider interface.
 */
@Component
public class WhatsAppCloudApiProvider implements WhatsAppProvider {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppCloudApiProvider.class);
    private static final String GRAPH_URL = "https://graph.facebook.com/v19.0";

    public static final String MODE_FREE_FORM = "FREE_FORM";
    public static final String MODE_TEMPLATE = "TEMPLATE";

    private final AppSettingsRepository settingsRepository;
    private final RestClient restClient;

    public WhatsAppCloudApiProvider(AppSettingsRepository settingsRepository) {
        this.settingsRepository = settingsRepository;
        this.restClient = RestClient.create();
    }

    @Override
    public String name() {
        return "cloudapi";
    }

    @Override
    public boolean isConfigured() {
        AppSettings settings = settingsRepository.findById(1L).orElse(null);
        return settings != null
                && isNotBlank(settings.getWhatsAppPhoneNumberId())
                && isNotBlank(settings.getWhatsAppAccessToken());
    }

    @Override
    public boolean isHealthy() {
        return isConfigured();
    }

    @Override
    public WhatsAppConnectionStatus status() {
        if (!isConfigured()) {
            WhatsAppConnectionStatus status = WhatsAppConnectionStatus.of(WhatsAppProviderState.NOT_CONFIGURED);
            status.setProvider(name());
            status.setMessage("Cloud API phone number ID / access token not configured");
            return status;
        }
        WhatsAppConnectionStatus status = WhatsAppConnectionStatus.of(WhatsAppProviderState.CONNECTED);
        status.setProvider(name());
        status.setConfigured(true);
        status.setMessage("Connected via Meta Cloud API");
        return status;
    }

    @Override
    public WhatsAppSendResult sendText(WhatsAppMessageRequest request) {
        AppSettings settings = settingsRepository.findById(1L).orElse(null);
        if (settings == null || !isConfigured()) {
            return WhatsAppSendResult.fail(name(), "Cloud API is not configured", false);
        }
        String to = PhoneNumberUtil.toE164(request.getTo(), null);
        if (to == null) {
            return WhatsAppSendResult.fail(name(), "Invalid phone number: " + request.getTo(), false);
        }
        boolean useTemplate = MODE_TEMPLATE.equalsIgnoreCase(settings.getWhatsAppMode())
                && isNotBlank(request.getTemplateName());
        boolean ok = useTemplate
                ? sendTemplate(settings, to, request.getTemplateName(), request.getTemplateParams())
                : sendFreeForm(settings, to, request.getBody());
        if (ok) {
            return WhatsAppSendResult.ok(null, name());
        }
        return WhatsAppSendResult.fail(name(), "Cloud API request failed", true);
    }

    @Override
    public WhatsAppSendResult sendDocument(WhatsAppDocumentRequest request) {
        // Cloud API sends media via upload; reuse the free-form text with a note
        // until explicit media support is needed.
        if (isBlank(request.getTo())) {
            return WhatsAppSendResult.fail(name(), "Recipient is required", false);
        }
        WhatsAppMessageRequest text = new WhatsAppMessageRequest(request.getCategory(), request.getTo(), request.getBody());
        return sendText(text);
    }

    private boolean sendFreeForm(AppSettings settings, String to, String body) {
        if (isBlank(to) || isBlank(body)) {
            return false;
        }
        try {
            Map<String, Object> payload = Map.of(
                    "messaging_product", "whatsapp",
                    "to", to,
                    "type", "text",
                    "text", Map.of("body", body));

            restClient.post()
                    .uri(GRAPH_URL + "/" + settings.getWhatsAppPhoneNumberId() + "/messages")
                    .header("Authorization", "Bearer " + settings.getWhatsAppAccessToken())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();

            log.info("WhatsApp Cloud API text message sent to {}", to);
            return true;
        } catch (Exception e) {
            log.error("WhatsApp Cloud API text message failed for {}: {}", to, e.getMessage());
            return false;
        }
    }

    private boolean sendTemplate(AppSettings settings, String to, String templateName, List<String> params) {
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
                    "to", to,
                    "type", "template",
                    "template", template);

            restClient.post()
                    .uri(GRAPH_URL + "/" + settings.getWhatsAppPhoneNumberId() + "/messages")
                    .header("Authorization", "Bearer " + settings.getWhatsAppAccessToken())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();

            log.info("WhatsApp Cloud API template message '{}' sent to {}", templateName, to);
            return true;
        } catch (Exception e) {
            log.error("WhatsApp Cloud API template message '{}' failed for {}: {}", templateName, to, e.getMessage());
            return false;
        }
    }

    @Override
    public void connect() {
        // Cloud API needs no local session.
    }

    @Override
    public void reconnect() {
        // Cloud API needs no local session.
    }

    @Override
    public void logout() {
        // Cloud API needs no local session.
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private boolean isNotBlank(String value) {
        return !isBlank(value);
    }
}