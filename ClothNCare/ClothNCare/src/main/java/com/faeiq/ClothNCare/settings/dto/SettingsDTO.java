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
}
