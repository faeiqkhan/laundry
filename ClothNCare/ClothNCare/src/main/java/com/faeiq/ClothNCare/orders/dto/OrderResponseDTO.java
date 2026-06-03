package com.faeiq.ClothNCare.orders.dto;


import com.faeiq.ClothNCare.orders.entity.Status;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@AllArgsConstructor
public class OrderResponseDTO {
    private String id;
    private Status status;
    private BigDecimal totalPrice;
    private LocalDate expectedDeliveryDate;
    private String invoiceUrl;
    private String customerName;
    private String customerPhone;
    private String createdByName;
    private List<OrderItemResponseDTO> items;
}
