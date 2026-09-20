package com.faeiq.ClothNCare.messaging.whatsapp;

/**
 * Provider abstraction over any WhatsApp delivery backend.
 * Implementations must not contain business logic: send methods only wrap the
 * transport (Node whatsapp-web.js service or Meta Cloud API).
 */
public interface WhatsAppProvider {

    /** Stable identifier used to switch providers via settings ("webjs", "cloudapi"). */
    String name();

    /** Whether required credentials/endpoint are present. */
    boolean isConfigured();

    /** Whether the underlying transport is reachable. */
    boolean isHealthy();

    /** Normalized connection status (state, QR data, business number). */
    WhatsAppConnectionStatus status();

    /** Send a plain text (or template) message synchronously. */
    WhatsAppSendResult sendText(WhatsAppMessageRequest request);

    /** Send a document (e.g. invoice PDF) synchronously. */
    WhatsAppSendResult sendDocument(WhatsAppDocumentRequest request);

    /** Start/attach the WhatsApp client (pick up QR if one is waiting). */
    void connect();

    /** Force a full client restart (new QR flow). */
    void reconnect();

    /** Log out of WhatsApp and clear the session. */
    void logout();
}