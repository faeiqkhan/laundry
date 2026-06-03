package com.faeiq.ClothNCare.LaundryService.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LaundryService {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    // Dry Clean, Wash, Iron
    private String name;

    // Shirt, Pant, Blanket
    private String productType;

    private BigDecimal price;

    private boolean active = true;
}