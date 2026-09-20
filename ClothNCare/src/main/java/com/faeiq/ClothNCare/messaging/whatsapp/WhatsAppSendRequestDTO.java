package com.faeiq.ClothNCare.messaging.whatsapp;

/**
 * Body for the manual /test WhatsApp send action.
 */
public class WhatsAppSendRequestDTO {

    private String to;
    private String body;

    public String getTo() {
        return to;
    }

    public void setTo(String to) {
        this.to = to;
    }

    public String getBody() {
        return body;
    }

    public void setBody(String body) {
        this.body = body;
    }
}