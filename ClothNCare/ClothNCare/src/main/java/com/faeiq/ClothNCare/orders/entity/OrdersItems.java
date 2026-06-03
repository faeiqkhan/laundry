package com.faeiq.ClothNCare.orders.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;

@Entity
@Data
public class OrdersItems {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne
    @JoinColumn(name = "orders_id")
    private Orders orders;

    private String service_type;
    private String product_type;
    private int quantity;
    private BigDecimal price;

}
