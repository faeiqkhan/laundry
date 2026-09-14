package com.faeiq.ClothNCare.orders.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class OrderOverviewDTO {
    private long total;
    private long active;
    private long due;
}