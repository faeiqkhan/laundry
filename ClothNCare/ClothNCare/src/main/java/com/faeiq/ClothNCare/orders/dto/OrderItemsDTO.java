package com.faeiq.ClothNCare.orders.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class OrderItemsDTO {

    @JsonAlias("service_type")
    private String serviceType;

    @JsonAlias("product_type")
    private String productType;

    private int quantity;

    @JsonAlias("unit_price")
    private BigDecimal unitPrice;
}
