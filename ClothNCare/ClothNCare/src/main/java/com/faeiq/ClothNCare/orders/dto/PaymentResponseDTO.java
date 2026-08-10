package com.faeiq.ClothNCare.orders.dto;

import com.faeiq.ClothNCare.orders.entity.PaymentMethod;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class PaymentResponseDTO {
    private String id;
    private BigDecimal amount;
    private PaymentMethod method;
    private LocalDateTime paidAt;
    private String recordedByName;
}
