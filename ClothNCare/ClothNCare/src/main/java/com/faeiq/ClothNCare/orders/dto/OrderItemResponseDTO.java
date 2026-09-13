package com.faeiq.ClothNCare.orders.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
public class OrderItemResponseDTO {
    private String id;
    private String productId;
    private String productName;
    private String serviceType;
    private String productType;
    private String uom;
    private BigDecimal quantity;
    private BigDecimal unitPrice;
    private BigDecimal lineTotal;
}