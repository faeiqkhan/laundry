package com.faeiq.ClothNCare.product.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class ProductDTO {

    private String name;

    private String unit;

    private BigDecimal price;

    private boolean active = true;
}
