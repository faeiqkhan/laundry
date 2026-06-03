package com.faeiq.ClothNCare.LaundryService.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
public class LaundryServiceResponseDTO {
    private String id;
    private String name;
    private String productType;
    private BigDecimal price;
    private boolean active;
}
