package com.faeiq.ClothNCare.messaging.whatsapp;

/**
 * Provider-neutral normalized connection state presented to the frontend.
 */
public enum WhatsAppProviderState {

    NOT_CONFIGURED,
    CONNECTING,
    QR_REQUIRED,
    CONNECTED,
    DISCONNECTED,
    AUTH_FAILURE,
    LOGGED_OUT,
    OFFLINE,
    ERROR
}