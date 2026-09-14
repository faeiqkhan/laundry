package com.faeiq.ClothNCare.migration.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * A single row from the Swash "Payments (received)" export. The Document No is
 * the invoice/order number the payment was recorded against; a payment exists
 * only when money was actually received (per the owner: "if payment received
 * the order is done").
 */
public record PaymentReceivedRow(
        String customerName,
        String mobile,
        String documentNo,
        LocalDateTime createdDateTime,
        LocalDate paymentDate,
        String description,
        String paymentType,
        BigDecimal discountAmount,
        BigDecimal receivedAmount,
        BigDecimal totalAmount,
        String paymentSource) {
}