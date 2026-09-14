package com.faeiq.ClothNCare.migration.model;

import java.math.BigDecimal;
import java.time.LocalDate;

public record OrderDetailRow(
        String customerName,
        String orderNo,
        LocalDate orderDate,
        LocalDate deliveryDate,
        String productName,
        String service,
        String unit,
        BigDecimal quantity,
        BigDecimal price,
        BigDecimal totalAmount) {
}