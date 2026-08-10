package com.faeiq.ClothNCare.expense.repository;

import com.faeiq.ClothNCare.expense.entity.Expense;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface ExpenseRepository extends JpaRepository<Expense, String> {

    List<Expense> findByExpenseDateBetween(LocalDate from, LocalDate to);
}
