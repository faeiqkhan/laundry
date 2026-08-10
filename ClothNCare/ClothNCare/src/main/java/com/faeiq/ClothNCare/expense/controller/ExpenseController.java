package com.faeiq.ClothNCare.expense.controller;

import com.faeiq.ClothNCare.common.ApiResponse;
import com.faeiq.ClothNCare.common.ApiResponseUtil;
import com.faeiq.ClothNCare.expense.dto.ExpenseDTO;
import com.faeiq.ClothNCare.expense.dto.ExpenseResponseDTO;
import com.faeiq.ClothNCare.expense.service.ExpenseService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/expenses")
@RequiredArgsConstructor
public class ExpenseController {

    private final ExpenseService expenseService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ExpenseResponseDTO>>> getExpenses(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponseUtil.success(expenseService.getExpenses(from, to), "Expenses fetched"));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ExpenseResponseDTO>> createExpense(@RequestBody ExpenseDTO dto) {
        return ResponseEntity.ok(ApiResponseUtil.success(expenseService.createExpense(dto), "Expense added"));
    }

    @PostMapping("/bulk")
    public ResponseEntity<ApiResponse<List<ExpenseResponseDTO>>> createExpenses(@RequestBody List<ExpenseDTO> dtos) {
        return ResponseEntity.ok(ApiResponseUtil.success(expenseService.createExpenses(dtos), "Expenses added"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteExpense(@PathVariable String id) {
        expenseService.deleteExpense(id);
        return ResponseEntity.ok(ApiResponseUtil.success(null, "Expense deleted"));
    }
}
