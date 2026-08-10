package com.faeiq.ClothNCare.customer.dto;

import com.faeiq.ClothNCare.orders.dto.OrderResponseDTO;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
public class CustomerDetailDTO {
    private String id;
    private String name;
    private String phone;
    private String email;
    private String address;
    private String notes;
    private LocalDateTime createdAt;
    private long orderCount;
    private BigDecimal totalSpent;
    private List<OrderResponseDTO> orders;
}
