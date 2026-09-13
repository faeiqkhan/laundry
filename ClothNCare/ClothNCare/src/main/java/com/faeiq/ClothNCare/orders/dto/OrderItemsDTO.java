package com.faeiq.ClothNCare.orders.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class OrderItemsDTO {

    @JsonAlias("product_id")
    private String productId;

    @JsonAlias("product_name")
    private String productName;

    @JsonAlias("service_type")
    private String serviceType;

    @JsonAlias("product_type")
    private String productType;

    private String uom;

    private BigDecimal quantity = BigDecimal.ONE;

    @JsonAlias("unit_price")
    private BigDecimal unitPrice;
}