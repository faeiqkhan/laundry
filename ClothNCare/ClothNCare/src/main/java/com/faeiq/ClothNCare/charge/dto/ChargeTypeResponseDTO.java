package com.faeiq.ClothNCare.charge.dto;

import com.faeiq.ClothNCare.charge.entity.ChargeType.ChargeCalculation;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
public class ChargeTypeResponseDTO {
    private String id;
    private String name;
    private ChargeCalculation calculation;
    private BigDecimal defaultAmount;
    private boolean active;
}
