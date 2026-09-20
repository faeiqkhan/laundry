package com.faeiq.ClothNCare.messaging.whatsapp;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Verifies the webjs provider wires to the Node service JSON contract.
 * No real WhatsApp involved — an in-process loopback HTTP server stands in
 * for the Node service.
 */
class WhatsAppWebJsProviderTest {

    private HttpServer server;
    private WhatsAppWebJsProvider provider;
    private final List<String> seenPaths = new ArrayList<>();
    private final List<String> seenAuthHeaders = new ArrayList<>();
    private String responseBody = "{\"success\":true,\"data\":{\"providerMessageId\":\"W123\",\"status\":\"SENT\"}}";
    private int responseCode = 200;

    @BeforeEach
    void setUp() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", exchange -> {
            seenPaths.add(exchange.getRequestMethod() + " " + exchange.getRequestURI().getPath());
            String auth = exchange.getRequestHeaders().getFirst("X-Internal-Token");
            if (auth != null) {
                seenAuthHeaders.add(auth);
            }
            byte[] body = responseBody.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(responseCode, body.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(body);
            }
        });
        server.start();

        WhatsAppProperties properties = new WhatsAppProperties();
        properties.setServiceUrl("http://127.0.0.1:" + server.getAddress().getPort());
        properties.setServiceToken("unit-token");
        properties.setConnectTimeoutMs(2000);
        properties.setReadTimeoutMs(2000);

        provider = new WhatsAppWebJsProvider(properties);
    }

    @AfterEach
    void tearDown() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    void healthReflectsServiceEndpoint() {
        responseBody = "{\"status\":\"ok\",\"service\":\"clothncare-whatsapp-service\"}";
        assertTrue(provider.isHealthy());
    }

    @Test
    void healthFalseWhenServiceUnreachable() {
        provider = new WhatsAppWebJsProvider(propertiesWithPort(1));
        assertFalse(provider.isHealthy());
    }

    @Test
    void statusMapsQrRequiredStateAndData() {
        responseBody = "{\"success\":true,\"data\":{"
                + "\"status\":\"QR_REQUIRED\",\"qrDataUrl\":\"data:image/png;base64,ABC\","
                + "\"businessNumber\":\"\",\"lastConnectedAt\":\"\"}}";

        WhatsAppConnectionStatus status = provider.status();

        assertEquals(WhatsAppProviderState.QR_REQUIRED, status.getState());
        assertFalse(status.isConnected());
        assertEquals("data:image/png;base64,ABC", status.getQrDataUrl());
    }

    @Test
    void statusMapsReadyToConnected() {
        responseBody = "{\"success\":true,\"data\":{\"status\":\"READY\",\"businessNumber\":\"919876543210\"}}";
        WhatsAppConnectionStatus status = provider.status();
        assertEquals(WhatsAppProviderState.CONNECTED, status.getState());
        assertTrue(status.isConnected());
    }

    @Test
    void statusMapsOfflineWhenServiceDown() {
        provider = new WhatsAppWebJsProvider(propertiesWithPort(1));
        WhatsAppConnectionStatus status = provider.status();
        assertEquals(WhatsAppProviderState.OFFLINE, status.getState());
        assertFalse(status.isConnected());
    }

    @Test
    void sendTextReturnsProviderMessageIdOnSuccess() {
        WhatsAppMessageRequest request = new WhatsAppMessageRequest(WhatsAppMessageStatus.CAT_MANUAL,
                "919876543210", "hello");
        WhatsAppSendResult result = provider.sendText(request);

        assertTrue(result.isSuccess());
        assertEquals("W123", result.getProviderMessageId());
        assertEquals("webjs", result.getProvider());
        assertTrue(seenPaths.contains("POST /api/whatsapp/messages"));
        assertTrue(seenAuthHeaders.contains("unit-token"));
    }

    @Test
    void sendTextMapsFailureToRetryableWhenDisconnected() {
        responseCode = 502;
        responseBody = "{\"success\":false,\"message\":\"WhatsApp is not connected yet - scan the QR code first.\"}";

        WhatsAppSendResult result = provider.sendText(
                new WhatsAppMessageRequest(WhatsAppMessageStatus.CAT_MANUAL, "919876543210", "hello"));

        assertFalse(result.isSuccess());
        assertTrue(result.getFailureReason().contains("not connected"));
        assertTrue(result.isRetryable());
    }

    @Test
    void sendTextMarksUnregisteredNumbersAsNonRetryable() {
        responseCode = 502;
        responseBody = "{\"success\":false,\"message\":\"Number 919876543210 is not registered on WhatsApp\"}";

        WhatsAppSendResult result = provider.sendText(
                new WhatsAppMessageRequest(WhatsAppMessageStatus.CAT_MANUAL, "919876543210", "hello"));

        assertFalse(result.isSuccess());
        assertFalse(result.isRetryable());
    }

    @Test
    void sendDocumentPostsToDocumentEndpoint() {
        responseBody = "{\"success\":true,\"data\":{\"providerMessageId\":\"W456\",\"status\":\"SENT\"}}";
        WhatsAppDocumentRequest request = new WhatsAppDocumentRequest();
        request.setTo("919876543210");
        request.setFilePath("C:\\\\invoices\\\\INV-1.pdf");
        request.setFilename("INV-1.pdf");
        WhatsAppSendResult result = provider.sendDocument(request);
        assertTrue(result.isSuccess());
        assertTrue(seenPaths.contains("POST /api/whatsapp/messages/document"));
    }

    private WhatsAppProperties propertiesWithPort(int port) {
        WhatsAppProperties props = new WhatsAppProperties();
        props.setServiceUrl("http://127.0.0.1:" + port);
        props.setServiceToken("unit-token");
        props.setConnectTimeoutMs(300);
        props.setReadTimeoutMs(300);
        return props;
    }
}