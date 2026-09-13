package com.faeiq.ClothNCare.messaging.whatsapp;

import java.time.LocalDateTime;

/**
 * Provider-neutral connection status snapshot for the UI (Settings -> WhatsApp).
 */
public class WhatsAppConnectionStatus {

    private String provider;
    private WhatsAppProviderState state;
    private boolean connected;
    private boolean configured;
    private String qrDataUrl;
    private String businessNumber;
    private String lastConnectedAt;
    private String message;

    public static WhatsAppConnectionStatus of(WhatsAppProviderState state) {
        WhatsAppConnectionStatus status = new WhatsAppConnectionStatus();
        status.setState(state);
        status.setConnected(state == WhatsAppProviderState.CONNECTED);
        return status;
    }

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public WhatsAppProviderState getState() {
        return state;
    }

    public void setState(WhatsAppProviderState state) {
        this.state = state;
    }

    public boolean isConnected() {
        return connected;
    }

    public void setConnected(boolean connected) {
        this.connected = connected;
    }

    public boolean isConfigured() {
        return configured;
    }

    public void setConfigured(boolean configured) {
        this.configured = configured;
    }

    public String getQrDataUrl() {
        return qrDataUrl;
    }

    public void setQrDataUrl(String qrDataUrl) {
        this.qrDataUrl = qrDataUrl;
    }

    public String getBusinessNumber() {
        return businessNumber;
    }

    public void setBusinessNumber(String businessNumber) {
        this.businessNumber = businessNumber;
    }

    public String getLastConnectedAt() {
        return lastConnectedAt;
    }

    public void setLastConnectedAt(String lastConnectedAt) {
        this.lastConnectedAt = lastConnectedAt;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}