package com.faeiq.ClothNCare.customer.controller;

import com.faeiq.ClothNCare.common.ApiResponse;
import com.faeiq.ClothNCare.common.ApiResponseUtil;
import com.faeiq.ClothNCare.customer.dto.CustomerDTO;
import com.faeiq.ClothNCare.customer.dto.CustomerResponseDTO;
import com.faeiq.ClothNCare.customer.dto.CustomerSummaryDTO;
import com.faeiq.ClothNCare.customer.service.CustomerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;

    @PostMapping
    public ResponseEntity<ApiResponse<CustomerResponseDTO>> createCustomer(@RequestBody CustomerDTO customerDTO) {
        CustomerResponseDTO customer = customerService.createCustomer(customerDTO);
        return ResponseEntity.ok(ApiResponseUtil.success(customer, "Customer added successfully"));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<CustomerResponseDTO>>> getAllCustomers() {
        List<CustomerResponseDTO> customers = customerService.getAllCustomers();
        return ResponseEntity.ok(ApiResponseUtil.success(customers, "Customers fetched successfully"));
    }

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<List<CustomerSummaryDTO>>> getCustomers() {
        List<CustomerSummaryDTO> customers = customerService.getCustomerSummaries();
        return ResponseEntity.ok(ApiResponseUtil.success(customers, "Customers fetched successfully"));
    }

}
