package com.faeiq.ClothNCare.expense.service;

import com.faeiq.ClothNCare.common.exception.BadRequestException;
import com.faeiq.ClothNCare.common.exception.ResourceNotFoundException;
import com.faeiq.ClothNCare.expense.dto.ExpenseDTO;
import com.faeiq.ClothNCare.expense.dto.ExpenseResponseDTO;
import com.faeiq.ClothNCare.expense.entity.Expense;
import com.faeiq.ClothNCare.expense.repository.ExpenseRepository;
import com.faeiq.ClothNCare.user.entity.Users;
import com.faeiq.ClothNCare.user.repository.UsersRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final UsersRepository usersRepository;
    private final com.faeiq.ClothNCare.expensehead.repository.ExpenseHeadRepository expenseHeadRepository;

    @Transactional
    public ExpenseResponseDTO createExpense(ExpenseDTO dto) {
        return toResponse(expenseRepository.save(buildExpense(dto)));
    }

    @Transactional
    public List<ExpenseResponseDTO> createExpenses(List<ExpenseDTO> dtos) {
        if (dtos == null || dtos.isEmpty()) {
            throw new BadRequestException("Add at least one expense");
        }
        return dtos.stream()
                .map(this::buildExpense)
                .map(expenseRepository::save)
                .map(this::toResponse)
                .toList();
    }

    private Expense buildExpense(ExpenseDTO dto) {
        if (dto.getAmount() == null || dto.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Expense amount must be greater than zero");
        }
        if (dto.getCategory() == null || dto.getCategory().isBlank()) {
            throw new BadRequestException("Expense category is required");
        }
        if (dto.getExpenseHeadId() != null && !expenseHeadRepository.existsById(dto.getExpenseHeadId())) {
            throw new ResourceNotFoundException("Expense head not found");
        }

        Expense expense = new Expense();
        expense.setCategory(dto.getCategory());
        expense.setExpenseHeadId(dto.getExpenseHeadId());
        expense.setDescription(dto.getDescription());
        expense.setAmount(dto.getAmount());
        expense.setExpenseDate(dto.getExpenseDate() == null ? LocalDate.now() : dto.getExpenseDate());
        expense.setCreatedAt(LocalDateTime.now());
        expense.setCreatedBy(getCurrentUser());
        return expense;
    }

    @Transactional(readOnly = true)
    public List<ExpenseResponseDTO> getExpenses(LocalDate from, LocalDate to) {
        LocalDate start = from == null ? LocalDate.now().minusDays(30) : from;
        LocalDate end = to == null ? LocalDate.now() : to;
        return expenseRepository.findByExpenseDateBetween(start, end).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public void deleteExpense(String id) {
        if (!expenseRepository.existsById(id)) {
            throw new ResourceNotFoundException("Expense not found");
        }
        expenseRepository.deleteById(id);
    }

    private Users getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null) {
            return null;
        }
        return usersRepository.findByEmail(authentication.getName());
    }

    private ExpenseResponseDTO toResponse(Expense expense) {
        return new ExpenseResponseDTO(
                expense.getId(),
                expense.getCategory(),
                expense.getExpenseHeadId(),
                expense.getDescription(),
                expense.getAmount(),
                expense.getExpenseDate(),
                expense.getCreatedAt(),
                expense.getCreatedBy() != null ? expense.getCreatedBy().getName() : null
        );
    }
}
