package com.faeiq.ClothNCare.customer.controller;

import com.faeiq.ClothNCare.common.ApiResponse;
import com.faeiq.ClothNCare.common.ApiResponseUtil;
import com.faeiq.ClothNCare.common.dto.PageResponse;
import com.faeiq.ClothNCare.customer.dto.CustomerDTO;
import com.faeiq.ClothNCare.customer.dto.CustomerDetailDTO;
import com.faeiq.ClothNCare.customer.dto.CustomerResponseDTO;
import com.faeiq.ClothNCare.customer.dto.CustomerSummaryDTO;
import com.faeiq.ClothNCare.customer.service.CustomerService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
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
@RequestMapping("/api/customers")
@RequiredArgsConstructor
public class CustomerController {

    private static final int DEFAULT_PAGE_SIZE = 10;
    private static final int MAX_PAGE_SIZE = 100;

    private final CustomerService customerService;

    @PostMapping
    public ResponseEntity<ApiResponse<CustomerResponseDTO>> createCustomer(@RequestBody CustomerDTO customerDTO) {
        CustomerResponseDTO customer = customerService.createCustomer(customerDTO);
        return ResponseEntity.ok(ApiResponseUtil.success(customer, "Customer added successfully"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<CustomerResponseDTO>> updateCustomer(@PathVariable String id,
                                                                           @RequestBody CustomerDTO customerDTO) {
        CustomerResponseDTO customer = customerService.updateCustomer(id, customerDTO);
        return ResponseEntity.ok(ApiResponseUtil.success(customer, "Customer updated successfully"));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Object>> getAllCustomers(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false, defaultValue = "created_at,desc") String sort,
            @RequestParam(required = false) String q) {

        if (page == null && size == null) {
            List<CustomerResponseDTO> customers = customerService.getAllCustomers();
            return ResponseEntity.ok(ApiResponseUtil.success(customers, "Customers fetched successfully"));
        }

        int pageNumber = page == null ? 0 : Math.max(page, 0);
        int pageSize = size == null ? DEFAULT_PAGE_SIZE : Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        Page<CustomerResponseDTO> result = customerService.getCustomerPage(
                PageRequest.of(pageNumber, pageSize, parseSort(sort)),
                q);
        return ResponseEntity.ok(ApiResponseUtil.success(PageResponse.of(result), "Customers fetched successfully"));
    }

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<List<CustomerSummaryDTO>>> getCustomers() {
        List<CustomerSummaryDTO> customers = customerService.getCustomerSummaries();
        return ResponseEntity.ok(ApiResponseUtil.success(customers, "Customers fetched successfully"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CustomerDetailDTO>> getCustomer(@PathVariable String id) {
        CustomerDetailDTO customer = customerService.getCustomerDetail(id);
        return ResponseEntity.ok(ApiResponseUtil.success(customer, "Customer fetched successfully"));
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
}
