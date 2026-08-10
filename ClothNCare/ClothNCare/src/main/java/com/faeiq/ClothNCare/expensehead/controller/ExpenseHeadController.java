package com.faeiq.ClothNCare.expensehead.controller;

import com.faeiq.ClothNCare.common.ApiResponse;
import com.faeiq.ClothNCare.common.ApiResponseUtil;
import com.faeiq.ClothNCare.expensehead.dto.ExpenseHeadDTO;
import com.faeiq.ClothNCare.expensehead.dto.ExpenseHeadResponseDTO;
import com.faeiq.ClothNCare.expensehead.service.ExpenseHeadService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/expense-heads")
@RequiredArgsConstructor
public class ExpenseHeadController {

    private final ExpenseHeadService expenseHeadService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ExpenseHeadResponseDTO>>> getAllHeads() {
        return ResponseEntity.ok(ApiResponseUtil.success(expenseHeadService.getAllHeads(), "Expense heads fetched"));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<ExpenseHeadResponseDTO>> createHead(@RequestBody ExpenseHeadDTO dto) {
        return ResponseEntity.ok(ApiResponseUtil.success(expenseHeadService.createHead(dto), "Expense head added"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<ExpenseHeadResponseDTO>> updateHead(@PathVariable String id, @RequestBody ExpenseHeadDTO dto) {
        return ResponseEntity.ok(ApiResponseUtil.success(expenseHeadService.updateHead(id, dto), "Expense head updated"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<Void>> deleteHead(@PathVariable String id) {
        expenseHeadService.deleteHead(id);
        return ResponseEntity.ok(ApiResponseUtil.success(null, "Expense head deleted"));
    }
}
