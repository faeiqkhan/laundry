package com.faeiq.ClothNCare.settings.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Column;
import lombok.Data;

import java.math.BigDecimal;

@Entity
@Data
public class AppSettings {

    @Id
    private Long id = 1L;

    private String businessName = "Cloth & Care";
    private String tagline = "Wash, Fold & Deliver";
    private String phone = "";
    private String email = "";
    private String address = "";
    private String currencySymbol = "\u20B9";
    private String currencyCode = "INR";
    private BigDecimal taxRate = BigDecimal.ZERO;
    private String invoiceFooter = "Thank you for your business!";
    private String termsAndConditions = "1. Items left for more than 30 days will incur a storage charge.\n2. Please check your clothes at the time of delivery; no claims after 24 hours.\n3. Cloth & Care is not responsible for shrinkage or colour bleeding.\n4. Valuable items should be removed before washing.";
    private long invoiceCounter = 0L;
    private String upiId = "";
    private String storeSignaturePath = "";

    private boolean whatsAppEnabled = false;
    private String whatsAppPhoneNumberId = "";
    private String whatsAppAccessToken = "";
    private String whatsAppMode = "FREE_FORM";
    private String whatsAppWelcomeTemplate = "";
    private String whatsAppInvoiceTemplate = "";
    private String whatsAppStatusTemplate = "";
    private String whatsAppProvider = "webjs";
    private boolean whatsAppTestMode = true;
    private String whatsAppTestNumber = "";
    @Column(columnDefinition = "integer default 0")
private boolean whatsAppAutoWelcome = false;
@Column(columnDefinition = "integer default 0")
private boolean whatsAppAutoInvoice = false;
@Column(columnDefinition = "integer default 0")
private boolean whatsAppAutoStatus = false;
@Column(columnDefinition = "integer default 0")
private boolean whatsAppAutoThankYou = false;
@Column(columnDefinition = "text default ''")
private String whatsAppThankYouMessage = "";
@Column(columnDefinition = "text default ''")
private String whatsAppWelcomeMessage = "";
@Column(columnDefinition = "text default ''")
private String whatsAppStatusMessage = "";
}
