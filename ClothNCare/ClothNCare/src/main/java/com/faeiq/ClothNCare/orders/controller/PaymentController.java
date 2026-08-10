package com.faeiq.ClothNCare.orders.controller;

import com.faeiq.ClothNCare.common.ApiResponse;
import com.faeiq.ClothNCare.common.ApiResponseUtil;
import com.faeiq.ClothNCare.orders.dto.PaymentRecordDTO;
import com.faeiq.ClothNCare.orders.dto.OrderResponseDTO;
import com.faeiq.ClothNCare.orders.service.OrdersService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final OrdersService ordersService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<PaymentRecordDTO>>> getPayments(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponseUtil.success(ordersService.getPayments(from, to), "Payments fetched"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<OrderResponseDTO>> deletePayment(@PathVariable String id) {
        OrderResponseDTO order = ordersService.deletePayment(id);
        return ResponseEntity.ok(ApiResponseUtil.success(order, "Payment deleted successfully"));
    }
}
