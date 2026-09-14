package com.faeiq.ClothNCare.migration.controller;

import com.faeiq.ClothNCare.common.ApiResponse;
import com.faeiq.ClothNCare.common.ApiResponseUtil;
import com.faeiq.ClothNCare.common.exception.BadRequestException;
import com.faeiq.ClothNCare.migration.dto.SwashDryRunReport;
import com.faeiq.ClothNCare.migration.dto.SwashExecutionResult;
import com.faeiq.ClothNCare.migration.service.SwashMigrationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/migration")
@RequiredArgsConstructor
public class MigrationController {

    private final SwashMigrationService migrationService;

    @GetMapping("/status")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<Map<String, Long>>> status() {
        return ResponseEntity.ok(ApiResponseUtil.success(migrationService.migrationStatus(), "Migration status"));
    }

    @PostMapping("/dry-run")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<SwashDryRunReport>> dryRun(
            @RequestParam(value = "booked", required = false) MultipartFile booked,
            @RequestParam(value = "invoices", required = false) MultipartFile invoices,
            @RequestParam(value = "orderDetails", required = false) MultipartFile orderDetails,
            @RequestParam(value = "expenses", required = false) MultipartFile expenses,
            @RequestParam(value = "payments", required = false) MultipartFile payments) {
        SwashDryRunReport report = migrationService.dryRun(
                toBytes(booked), toBytes(invoices), toBytes(orderDetails), toBytes(expenses), toBytes(payments),
                filename(booked), filename(invoices), filename(orderDetails), filename(expenses), filename(payments));
        return ResponseEntity.ok(ApiResponseUtil.success(report, "Dry run completed"));
    }

    @PostMapping("/dry-run/local")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<SwashDryRunReport>> dryRunFromLocal() {
        SwashDryRunReport report = migrationService.dryRunFromDefaultDirectory();
        return ResponseEntity.ok(ApiResponseUtil.success(report, "Dry run completed (swash-data directory)"));
    }

    @PostMapping("/execute")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<SwashExecutionResult>> execute(
            @RequestParam(value = "booked", required = false) MultipartFile booked,
            @RequestParam(value = "invoices", required = false) MultipartFile invoices,
            @RequestParam(value = "orderDetails", required = false) MultipartFile orderDetails,
            @RequestParam(value = "expenses", required = false) MultipartFile expenses,
            @RequestParam(value = "payments", required = false) MultipartFile payments) {
        SwashExecutionResult result = migrationService.execute(
                toBytes(booked), toBytes(invoices), toBytes(orderDetails), toBytes(expenses), toBytes(payments));
        return ResponseEntity.ok(ApiResponseUtil.success(result, "Import completed"));
    }

    @PostMapping("/execute/local")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<SwashExecutionResult>> executeFromLocal() {
        SwashExecutionResult result = migrationService.executeFromDefaultDirectory();
        return ResponseEntity.ok(ApiResponseUtil.success(result, "Import completed (swash-data directory)"));
    }

    private byte[] toBytes(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return null;
        }
        try {
            return file.getBytes();
        } catch (IOException e) {
            throw new BadRequestException("Could not read uploaded file: " + e.getMessage());
        }
    }

    private String filename(MultipartFile file) {
        return file == null || file.isEmpty() ? null : file.getOriginalFilename();
    }
}