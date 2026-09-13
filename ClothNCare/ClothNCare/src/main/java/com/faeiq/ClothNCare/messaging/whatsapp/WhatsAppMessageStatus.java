package com.faeiq.ClothNCare.messaging.whatsapp;

/**
 * Lifecycle states of the WhatsApp message log and the provider connection.
 */
public final class WhatsAppMessageStatus {

    private WhatsAppMessageStatus() {
    }

    public static final String QUEUED = "QUEUED";
    public static final String SENDING = "SENDING";
    public static final String SENT = "SENT";
    public static final String FAILED = "FAILED";
    public static final String CANCELLED = "CANCELLED";
    public static final String SKIPPED = "SKIPPED";

    public static final String CAT_WELCOME = "WELCOME";
    public static final String CAT_INVOICE = "INVOICE";
    public static final String CAT_STATUS = "STATUS";
    public static final String CAT_MANUAL = "MANUAL";
    public static final String CAT_DOCUMENT = "DOCUMENT";
}