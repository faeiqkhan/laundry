package com.faeiq.ClothNCare.expensehead.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ExpenseHeadResponseDTO {
    private String id;
    private String name;
    private String description;
    private boolean active;
}
