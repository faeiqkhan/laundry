package com.faeiq.ClothNCare.orders.controller;

import com.faeiq.ClothNCare.common.ApiResponse;
import com.faeiq.ClothNCare.common.ApiResponseUtil;
import com.faeiq.ClothNCare.orders.dto.OrderDTO;
import com.faeiq.ClothNCare.orders.dto.OrderResponseDTO;
import com.faeiq.ClothNCare.orders.dto.PaymentRequestDTO;
import com.faeiq.ClothNCare.orders.entity.Status;
import com.faeiq.ClothNCare.orders.service.OrdersService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrdersController {

    private final OrdersService ordersService;

    @PostMapping
    public ResponseEntity<ApiResponse<OrderResponseDTO>> createOrder(@RequestBody OrderDTO orderDTO) {
        OrderResponseDTO order = ordersService.createOrder(orderDTO);
        return ResponseEntity.ok(ApiResponseUtil.success(order, "Order created successfully"));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<OrderResponseDTO>>> getAllOrders() {
        List<OrderResponseDTO> orders = ordersService.getAllOrders();
        return ResponseEntity.ok(ApiResponseUtil.success(orders, "Orders fetched successfully"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<OrderResponseDTO>> getOrderById(@PathVariable String id) {
        OrderResponseDTO order = ordersService.getOrderById(id);
        return ResponseEntity.ok(ApiResponseUtil.success(order, "Order fetched successfully"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<OrderResponseDTO>> updateOrder(
            @PathVariable String id,
            @RequestBody OrderDTO orderDTO) {

        OrderResponseDTO order = ordersService.updateOrder(id, orderDTO);
        return ResponseEntity.ok(ApiResponseUtil.success(order, "Order updated successfully"));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<ApiResponse<OrderResponseDTO>> updateStatus(
            @PathVariable String id,
            @RequestParam Status status) {

        OrderResponseDTO order = ordersService.updateStatus(id, status);
        return ResponseEntity.ok(ApiResponseUtil.success(order, "Status updated successfully"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<Void>> deleteOrder(@PathVariable String id) {
        ordersService.deleteOrder(id);
        return ResponseEntity.ok(ApiResponseUtil.success(null, "Order deleted successfully"));
    }

    @PostMapping("/{id}/payment")
    public ResponseEntity<ApiResponse<OrderResponseDTO>> recordPayment(
            @PathVariable String id,
            @RequestBody PaymentRequestDTO paymentDTO) {

        OrderResponseDTO order = ordersService.recordPayment(id, paymentDTO);
        return ResponseEntity.ok(ApiResponseUtil.success(order, "Payment recorded successfully"));
    }
}
