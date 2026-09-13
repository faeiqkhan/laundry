package com.faeiq.ClothNCare.settings.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class SettingsDTO {
    private String businessName;
    private String tagline;
    private String phone;
    private String email;
    private String address;
    private String currencySymbol;
    private String currencyCode;
    private BigDecimal taxRate;
    private String invoiceFooter;
    private String termsAndConditions;
    private Boolean whatsAppEnabled;
    private String whatsAppPhoneNumberId;
    private String whatsAppAccessToken;
    private String whatsAppMode;
    private String whatsAppWelcomeTemplate;
    private String whatsAppInvoiceTemplate;
    private String whatsAppStatusTemplate;
    private String whatsAppProvider;
    private Boolean whatsAppTestMode;
    private String whatsAppTestNumber;
    private Boolean whatsAppAutoWelcome;
    private Boolean whatsAppAutoInvoice;
    private Boolean whatsAppAutoStatus;
}
