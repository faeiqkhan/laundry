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

    private String product_id;
    private String product_name;
    private String service_type;
    private String product_type;
    private String uom;
    private BigDecimal quantity = BigDecimal.ONE;
    private BigDecimal price;

    public BigDecimal getLineTotal() {
        if (price == null || quantity == null) {
            return BigDecimal.ZERO;
        }
        return price.multiply(quantity);
    }
}
