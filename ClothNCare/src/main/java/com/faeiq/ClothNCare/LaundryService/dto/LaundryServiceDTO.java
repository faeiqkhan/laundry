package com.faeiq.ClothNCare.LaundryService.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class LaundryServiceDTO {
    private String name;
    private String productType;
    private BigDecimal price;
    private boolean active = true;
}
