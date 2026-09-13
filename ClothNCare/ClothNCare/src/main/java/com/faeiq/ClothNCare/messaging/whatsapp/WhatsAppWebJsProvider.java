package com.faeiq.ClothNCare.messaging.whatsapp;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Provider that talks to the isolated Node.js WhatsApp service
 * (whatsapp-web.js) over HTTP, secured by X-Internal-Token.
 */
@Component
public class WhatsAppWebJsProvider implements WhatsAppProvider {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppWebJsProvider.class);

    private static final String SERVICE_DOWN = "WhatsApp service is unreachable";
    private static final String TOKEN_HEADER = "X-Internal-Token";

    private static final Pattern SUCCESS_FLAG = Pattern.compile("\"success\"\\s*:\\s*true");
    private static final Pattern FIELD = Pattern.compile("\"([A-Za-z0-9_]+)\"\\s*:\\s*\"([^\"]*)\"");

    private final WhatsAppProperties properties;
    private final RestClient restClient;

    public WhatsAppWebJsProvider(WhatsAppProperties properties) {
        this.properties = properties;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(properties.getConnectTimeoutMs());
        factory.setReadTimeout(properties.getReadTimeoutMs());
        RestClient.Builder builder = RestClient.builder()
                .baseUrl(properties.getServiceUrl())
                .requestFactory(factory);
        if (properties.getServiceToken() != null && !properties.getServiceToken().isBlank()) {
            builder = builder.defaultHeader(TOKEN_HEADER, properties.getServiceToken());
        }
        this.restClient = builder.build();
    }

    @Override
    public String name() {
        return "webjs";
    }

    @Override
    public boolean isConfigured() {
        return true;
    }

    @Override
    public boolean isHealthy() {
        try {
            String body = restClient.get()
                    .uri("/health")
                    .retrieve()
                    .body(String.class);
            return body != null && field(body, "status").equals("ok");
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public WhatsAppConnectionStatus status() {
        WhatsAppConnectionStatus status = WhatsAppConnectionStatus.of(WhatsAppProviderState.DISCONNECTED);
        status.setProvider(name());
        status.setConfigured(true);
        try {
            String body = restClient.get()
                    .uri("/api/whatsapp/status")
                    .retrieve()
                    .body(String.class);
            if (body == null) {
                return status;
            }
            status.setState(mapState(field(body, "status")));
            status.setConnected(status.getState() == WhatsAppProviderState.CONNECTED);
            status.setQrDataUrl(readRawField(body, "qrDataUrl"));
            status.setBusinessNumber(readRawField(body, "businessNumber"));
            status.setLastConnectedAt(readRawField(body, "lastConnectedAt"));
            status.setMessage(readRawField(body, "message"));
        } catch (Exception e) {
            status.setState(WhatsAppProviderState.OFFLINE);
            status.setConnected(false);
            status.setMessage(SERVICE_DOWN + ": " + safeMessage(e));
        }
        return status;
    }

    @Override
    public WhatsAppSendResult sendText(WhatsAppMessageRequest request) {
        return postText("/api/whatsapp/messages",
                "{\"to\":" + json(request.getTo()) + ",\"body\":" + json(request.getBody()) + "}");
    }

    @Override
    public WhatsAppSendResult sendDocument(WhatsAppDocumentRequest request) {
        return postText("/api/whatsapp/messages/document",
                "{\"to\":" + json(request.getTo())
                        + ",\"body\":" + json(request.getBody())
                        + ",\"filePath\":" + json(request.getFilePath())
                        + ",\"filename\":" + json(request.getFilename()) + "}");
    }

    private WhatsAppSendResult postText(String path, String payload) {
        try {
            String body = restClient.post()
                    .uri(path)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .body(String.class);
            if (body != null && SUCCESS_FLAG.matcher(body).find()) {
                return WhatsAppSendResult.ok(field(body, "providerMessageId"), name());
            }
            String reason = body != null && !field(body, "message").isEmpty()
                    ? field(body, "message") : "WhatsApp service rejected the message";
            return new WhatsAppSendResult(false, null, name(), reason, isRetryable(reason));
        } catch (RestClientResponseException e) {
            String reason = extractFailureReason(e);
            return new WhatsAppSendResult(false, null, name(), reason, isRetryable(reason));
        } catch (RestClientException e) {
            String reason = SERVICE_DOWN + ": " + safeMessage(e);
            return new WhatsAppSendResult(false, null, name(), reason, true);
        }
    }

    @Override
    public void connect() {
        postAction("/api/whatsapp/connect");
    }

    @Override
    public void reconnect() {
        postAction("/api/whatsapp/reconnect");
    }

    @Override
    public void logout() {
        postAction("/api/whatsapp/logout");
    }

    private void postAction(String path) {
        try {
            restClient.post().uri(path).contentType(MediaType.APPLICATION_JSON)
                    .body("{}").retrieve().toBodilessEntity();
        } catch (RestClientException e) {
            log.warn("WhatsApp service action {} failed: {}", path, safeMessage(e));
        }
    }

    private WhatsAppProviderState mapState(String nodeStatus) {
        if (nodeStatus == null || nodeStatus.isEmpty()) {
            return WhatsAppProviderState.DISCONNECTED;
        }
        return switch (nodeStatus) {
            case "READY", "AUTHENTICATED" -> WhatsAppProviderState.CONNECTED;
            case "QR_REQUIRED" -> WhatsAppProviderState.QR_REQUIRED;
            case "CONNECTING" -> WhatsAppProviderState.CONNECTING;
            case "AUTH_FAILURE" -> WhatsAppProviderState.AUTH_FAILURE;
            case "LOGGED_OUT" -> WhatsAppProviderState.LOGGED_OUT;
            case "ERROR" -> WhatsAppProviderState.ERROR;
            default -> WhatsAppProviderState.DISCONNECTED;
        };
    }

    private String extractFailureReason(RestClientResponseException e) {
        String raw = e.getResponseBodyAsString();
        if (raw != null) {
            String message = field(raw, "message");
            if (!message.isEmpty()) {
                return message;
            }
        }
        return "WhatsApp send failed (HTTP " + e.getStatusCode().value() + ")";
    }

    private boolean isRetryable(String reason) {
        if (reason == null) {
            return true;
        }
        String lower = reason.toLowerCase();
        if (lower.contains("not registered") || lower.contains("invalid phone")) {
            return false;
        }
        return lower.contains("not connected")
                || lower.contains("disconnected")
                || lower.contains("not ready")
                || lower.contains("unreachable")
                || lower.contains("offline");
    }

    private String field(String json, String name) {
        Matcher matcher = FIELD.matcher(json);
        while (matcher.find()) {
            if (name.equals(matcher.group(1))) {
                return matcher.group(2);
            }
        }
        return "";
    }

    private String readRawField(String json, String name) {
        String value = field(json, name);
        return value.isEmpty() ? null : value;
    }

    private static String json(String value) {
        if (value == null) {
            return "null";
        }
        StringBuilder sb = new StringBuilder("\"");
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            switch (c) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default -> {
                    if (c < 0x20) {
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
                }
            }
        }
        return sb.append("\"").toString();
    }

    private String safeMessage(Exception e) {
        Throwable cause = e.getCause();
        if (cause instanceof java.net.http.HttpTimeoutException) {
            return "request timed out";
        }
        String message = e.getMessage();
        return message == null ? e.getClass().getSimpleName() : message;
    }
}