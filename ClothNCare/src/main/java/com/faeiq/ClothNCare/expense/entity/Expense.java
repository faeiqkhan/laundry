package com.faeiq.ClothNCare.expense.entity;

import com.faeiq.ClothNCare.user.entity.Users;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Data
public class Expense {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String category;

    private String expenseHeadId;

    private String description;

    private BigDecimal amount;

    private LocalDate expenseDate;

    private LocalDateTime createdAt;

    @ManyToOne
    @JoinColumn(name = "created_by_user_id")
    private Users createdBy;
}
