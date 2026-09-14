package com.faeiq.ClothNCare.migration.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record BookedLaundryRow(
        String customerName,
        String mobile,
        String address,
        LocalDate orderDate,
        LocalDate deliveryDate,
        LocalDateTime createdDateTime,
        String orderNo,
        BigDecimal addnCharges,
        BigDecimal discount,
        BigDecimal totalAmount,
        String createdBy,
        String status,
        String orderFrom) {
}