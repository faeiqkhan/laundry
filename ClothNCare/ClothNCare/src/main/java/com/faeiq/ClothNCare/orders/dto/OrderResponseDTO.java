package com.faeiq.ClothNCare.orders.dto;


import com.faeiq.ClothNCare.orders.entity.Status;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
public class OrderResponseDTO {
    private String id;
    private Status status;
    private BigDecimal totalPrice;
    private BigDecimal discount;
    private BigDecimal taxAmount;
    private BigDecimal paidAmount;
    private BigDecimal balanceDue;
    private String paymentStatus;
    private String invoiceNumber;
    private LocalDate expectedDeliveryDate;
    private LocalDateTime createdAt;
    private String invoiceUrl;
    private String customerName;
    private String customerPhone;
    private String customerEmail;
    private String createdByName;
    private List<OrderItemResponseDTO> items;
    private List<PaymentResponseDTO> payments;
}
