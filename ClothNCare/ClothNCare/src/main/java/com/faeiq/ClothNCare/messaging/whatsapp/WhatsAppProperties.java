package com.faeiq.ClothNCare.messaging.whatsapp;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * WhatsApp integration settings bound from application.yaml and environment:
 *   WHATSAPP_SERVICE_URL      node service base URL (default http://127.0.0.1:3001)
 *   WHATSAPP_SERVICE_TOKEN    shared internal token (must match .env in node service)
 *   WHATSAPP_DEFAULT_COUNTRY  default dial country (default IN)
 *   WHATSAPP_MAX_RETRIES      delivery attempts before a message is cancelled
 *   WHATSAPP_TEST_MODE        force test-mode on/off (overrides DB setting)
 *   WHATSAPP_TEST_NUMBER      target number for test mode (overrides DB setting)
 */
@Configuration
@ConfigurationProperties(prefix = "whatsapp")
public class WhatsAppProperties {

    private String serviceUrl = "http://127.0.0.1:3001";
    private String serviceToken = "";
    private String defaultCountry = "IN";
    private int maxRetries = 3;
    private long deliveryPollIntervalMs = 30000;
    private int connectTimeoutMs = 5000;
    private int readTimeoutMs = 20000;
    private Boolean testMode;
    private String testNumber;

    public String getServiceUrl() {
        return serviceUrl;
    }

    public void setServiceUrl(String serviceUrl) {
        this.serviceUrl = serviceUrl;
    }

    public String getServiceToken() {
        return serviceToken;
    }

    public void setServiceToken(String serviceToken) {
        this.serviceToken = serviceToken;
    }

    public String getDefaultCountry() {
        return defaultCountry;
    }

    public void setDefaultCountry(String defaultCountry) {
        this.defaultCountry = defaultCountry;
    }

    public int getMaxRetries() {
        return maxRetries;
    }

    public void setMaxRetries(int maxRetries) {
        this.maxRetries = maxRetries;
    }

    public long getDeliveryPollIntervalMs() {
        return deliveryPollIntervalMs;
    }

    public void setDeliveryPollIntervalMs(long deliveryPollIntervalMs) {
        this.deliveryPollIntervalMs = deliveryPollIntervalMs;
    }

    public int getConnectTimeoutMs() {
        return connectTimeoutMs;
    }

    public void setConnectTimeoutMs(int connectTimeoutMs) {
        this.connectTimeoutMs = connectTimeoutMs;
    }

    public int getReadTimeoutMs() {
        return readTimeoutMs;
    }

    public void setReadTimeoutMs(int readTimeoutMs) {
        this.readTimeoutMs = readTimeoutMs;
    }

    public Boolean getTestMode() {
        return testMode;
    }

    public void setTestMode(Boolean testMode) {
        this.testMode = testMode;
    }

    public String getTestNumber() {
        return testNumber;
    }

    public void setTestNumber(String testNumber) {
        this.testNumber = testNumber;
    }
}