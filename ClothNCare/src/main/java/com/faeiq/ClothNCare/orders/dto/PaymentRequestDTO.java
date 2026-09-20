package com.faeiq.ClothNCare.orders.dto;

import com.faeiq.ClothNCare.orders.entity.PaymentMethod;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class PaymentRequestDTO {
    private BigDecimal amount;
    private PaymentMethod method;
}
