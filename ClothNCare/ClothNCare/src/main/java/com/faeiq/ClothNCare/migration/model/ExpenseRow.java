package com.faeiq.ClothNCare.migration.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record ExpenseRow(
        String expense,
        String employee,
        String details,
        BigDecimal amount,
        LocalDateTime createdDateTime,
        LocalDate expenseDate,
        String description,
        String isActive) {
}