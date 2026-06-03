package com.faeiq.ClothNCare.orders.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class OrderDTO {

    @JsonAlias("customer_id")
    private String customerId;

    private String email;
    private String phone;
    private List<OrderItemsDTO> items;

    @JsonAlias("expected_delivery_date")
    private LocalDate expectedDeliveryDate;
}
