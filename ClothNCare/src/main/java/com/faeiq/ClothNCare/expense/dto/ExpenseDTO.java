package com.faeiq.ClothNCare.expense.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class ExpenseDTO {
    private String category;
    private String expenseHeadId;
    private String description;
    private BigDecimal amount;
    private LocalDate expenseDate;
}
