package com.faeiq.ClothNCare.orders.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
public class OrderItemResponseDTO {
    private String id;
    private String serviceType;
    private String productType;
    private int quantity;
    private BigDecimal unitPrice;
    private BigDecimal lineTotal;
}
