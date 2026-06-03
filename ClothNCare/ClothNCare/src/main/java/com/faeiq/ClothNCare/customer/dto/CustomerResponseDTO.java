package com.faeiq.ClothNCare.customer.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class CustomerResponseDTO {
    private String id;
    private String name;
    private String phone;
    private String email;
    private LocalDateTime createdAt;
}
