package com.faeiq.ClothNCare.orders.controller;

import com.faeiq.ClothNCare.common.ApiResponse;
import com.faeiq.ClothNCare.common.ApiResponseUtil;
import com.faeiq.ClothNCare.common.dto.PageResponse;
import com.faeiq.ClothNCare.orders.dto.OrderDTO;
import com.faeiq.ClothNCare.orders.dto.OrderOverviewDTO;
import com.faeiq.ClothNCare.orders.dto.OrderResponseDTO;
import com.faeiq.ClothNCare.orders.dto.PaymentRequestDTO;
import com.faeiq.ClothNCare.orders.entity.Status;
import com.faeiq.ClothNCare.orders.service.OrdersService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
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

    private static final int DEFAULT_PAGE_SIZE = 10;
    private static final int MAX_PAGE_SIZE = 100;

    private final OrdersService ordersService;

    @PostMapping
    public ResponseEntity<ApiResponse<OrderResponseDTO>> createOrder(@RequestBody OrderDTO orderDTO) {
        OrderResponseDTO order = ordersService.createOrder(orderDTO);
        return ResponseEntity.ok(ApiResponseUtil.success(order, "Order created successfully"));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Object>> getAllOrders(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false, defaultValue = "created_at,desc") String sort,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String payment,
            @RequestParam(required = false) String q) {

        if (page == null && size == null) {
            List<OrderResponseDTO> orders = ordersService.getAllOrders();
            return ResponseEntity.ok(ApiResponseUtil.success(orders, "Orders fetched successfully"));
        }

        int pageNumber = page == null ? 0 : Math.max(page, 0);
        int pageSize = size == null ? DEFAULT_PAGE_SIZE : Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        Page<OrderResponseDTO> result = ordersService.getOrderPage(
                PageRequest.of(pageNumber, pageSize, parseSort(sort)),
                status,
                payment,
                q);
        return ResponseEntity.ok(ApiResponseUtil.success(PageResponse.of(result), "Orders fetched successfully"));
    }

    @GetMapping("/overview")
    public ResponseEntity<ApiResponse<OrderOverviewDTO>> getOverview() {
        OrderOverviewDTO overview = ordersService.getOverview();
        return ResponseEntity.ok(ApiResponseUtil.success(overview, "Overview fetched successfully"));
    }

    private Sort parseSort(String sort) {
        if (sort == null || sort.isBlank()) {
            return Sort.by(Sort.Direction.DESC, "created_at");
        }
        String[] parts = sort.split(",");
        String field = parts[0].trim();
        Sort.Direction direction = parts.length > 1 && "asc".equalsIgnoreCase(parts[1].trim())
                ? Sort.Direction.ASC : Sort.Direction.DESC;
        return Sort.by(direction, field);
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
