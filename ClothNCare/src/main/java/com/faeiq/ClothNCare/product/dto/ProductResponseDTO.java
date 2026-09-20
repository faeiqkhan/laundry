package com.faeiq.ClothNCare.product.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
public class ProductResponseDTO {
    private String id;
    private String name;
    private String service;
    private String category;
    private int priority;
    private String unit;
    private BigDecimal price;
    private boolean active;
}
