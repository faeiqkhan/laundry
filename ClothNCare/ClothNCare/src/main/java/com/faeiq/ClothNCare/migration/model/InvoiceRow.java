package com.faeiq.ClothNCare.migration.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record InvoiceRow(
        String customerName,
        String mobile,
        String address,
        LocalDateTime createdDateTime,
        LocalDate invoiceDate,
        LocalDate deliveryDate,
        String invoiceNo,
        BigDecimal totalDiscount,
        BigDecimal additionalCharges,
        BigDecimal totalAmount,
        String status,
        String createdBy,
        String sourceBy) {
}