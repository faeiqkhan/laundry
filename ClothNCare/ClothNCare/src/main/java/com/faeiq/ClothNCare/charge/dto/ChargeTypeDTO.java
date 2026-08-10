package com.faeiq.ClothNCare.charge.dto;

import com.faeiq.ClothNCare.charge.entity.ChargeType.ChargeCalculation;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class ChargeTypeDTO {

    private String name;

    private ChargeCalculation calculation;

    private BigDecimal defaultAmount;

    private boolean active = true;
}
