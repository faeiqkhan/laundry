package com.faeiq.ClothNCare.messaging.whatsapp;

/**
 * Outcome of an explicit (manual) WhatsApp send surfaced to the admin UI.
 */
public class WhatsAppDeliveryResult {

    private final boolean success;
    private final String messageLogId;
    private final String status;
    private final String providerMessageId;
    private final String provider;
    private final String message;
    private final boolean retryable;
    private final String orderId;
    private final String invoiceId;

    public WhatsAppDeliveryResult(boolean success, String messageLogId, String status,
                                  String providerMessageId, String provider, String message,
                                  boolean retryable, String orderId, String invoiceId) {
        this.success = success;
        this.messageLogId = messageLogId;
        this.status = status;
        this.providerMessageId = providerMessageId;
        this.provider = provider;
        this.message = message;
        this.retryable = retryable;
        this.orderId = orderId;
        this.invoiceId = invoiceId;
    }

    public boolean isSuccess() {
        return success;
    }

    public String getMessageLogId() {
        return messageLogId;
    }

    public String getStatus() {
        return status;
    }

    public String getProviderMessageId() {
        return providerMessageId;
    }

    public String getProvider() {
        return provider;
    }

    public String getMessage() {
        return message;
    }

    public boolean isRetryable() {
        return retryable;
    }

    public String getOrderId() {
        return orderId;
    }

    public String getInvoiceId() {
        return invoiceId;
    }
}