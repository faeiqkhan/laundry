package com.faeiq.ClothNCare.messaging.whatsapp;

/**
 * Provider-neutral send result returned by a WhatsAppProvider.
 */
public class WhatsAppSendResult {

    private final boolean success;
    private final String providerMessageId;
    private final String provider;
    private final String failureReason;
    private final boolean retryable;

    public WhatsAppSendResult(boolean success, String providerMessageId, String provider,
                              String failureReason, boolean retryable) {
        this.success = success;
        this.providerMessageId = providerMessageId;
        this.provider = provider;
        this.failureReason = failureReason;
        this.retryable = retryable;
    }

    public static WhatsAppSendResult ok(String providerMessageId, String provider) {
        return new WhatsAppSendResult(true, providerMessageId, provider, null, false);
    }

    public static WhatsAppSendResult fail(String provider, String failureReason, boolean retryable) {
        return new WhatsAppSendResult(false, null, provider, failureReason, retryable);
    }

    public boolean isSuccess() {
        return success;
    }

    public String getProviderMessageId() {
        return providerMessageId;
    }

    public String getProvider() {
        return provider;
    }

    public String getFailureReason() {
        return failureReason;
    }

    public boolean isRetryable() {
        return retryable;
    }
}