package com.faeiq.ClothNCare.charge.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Data;

import java.math.BigDecimal;

@Entity
@Data
public class ChargeType {

    public enum ChargeCalculation {
        FLAT,
        PERCENT
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String name;

    private ChargeCalculation calculation = ChargeCalculation.FLAT;

    private BigDecimal defaultAmount = BigDecimal.ZERO;

    private boolean active = true;
}
