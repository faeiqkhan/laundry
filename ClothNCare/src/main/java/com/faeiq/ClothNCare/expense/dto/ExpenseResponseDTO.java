package com.faeiq.ClothNCare.expense.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class ExpenseResponseDTO {
    private String id;
    private String category;
    private String expenseHeadId;
    private String description;
    private BigDecimal amount;
    private LocalDate expenseDate;
    private LocalDateTime createdAt;
    private String createdByName;
}
