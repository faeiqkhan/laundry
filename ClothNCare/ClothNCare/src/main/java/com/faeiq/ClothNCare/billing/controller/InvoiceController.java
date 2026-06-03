package com.faeiq.ClothNCare.billing.controller;

import com.faeiq.ClothNCare.billing.dto.InvoiceResponseDTO;
import com.faeiq.ClothNCare.billing.service.InvoiceService;
import com.faeiq.ClothNCare.common.ApiResponse;
import com.faeiq.ClothNCare.common.ApiResponseUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/invoice")
@RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceService invoiceService;

    @PostMapping("/{orderId}")
    public ResponseEntity<ApiResponse<InvoiceResponseDTO>> generateInvoice(@PathVariable String orderId) {
        InvoiceResponseDTO invoice = invoiceService.generateInvoice(orderId);
        return ResponseEntity.ok(ApiResponseUtil.success(invoice, "Invoice generated successfully"));
    }
}
