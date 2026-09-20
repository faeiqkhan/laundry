package com.faeiq.ClothNCare.product.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Data;

import java.math.BigDecimal;

@Entity
@Data
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String name;

    private String service;

    private String category;

    private int priority = 0;

    private String unit;

    private BigDecimal price = BigDecimal.ZERO;

    private boolean active = true;
}
