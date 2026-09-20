package com.faeiq.ClothNCare.product.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class ProductDTO {

    private String name;

    private String service;

    private String category;

    private int priority = 0;

    private String unit;

    private BigDecimal price;

    private boolean active = true;
}
