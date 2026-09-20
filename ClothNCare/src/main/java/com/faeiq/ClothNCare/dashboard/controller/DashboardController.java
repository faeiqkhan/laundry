package com.faeiq.ClothNCare.dashboard.controller;

import com.faeiq.ClothNCare.common.ApiResponse;
import com.faeiq.ClothNCare.common.ApiResponseUtil;
import com.faeiq.ClothNCare.dashboard.dto.AnalyticsDTO;
import com.faeiq.ClothNCare.dashboard.dto.AnalyticalDTO;
import com.faeiq.ClothNCare.dashboard.dto.DashboardResponseDTO;
import com.faeiq.ClothNCare.dashboard.dto.YearlyDTO;
import com.faeiq.ClothNCare.dashboard.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<DashboardResponseDTO>> getSummary() {
        return ResponseEntity.ok(
                ApiResponseUtil.success(
                        dashboardService.getSummary(),
                        "Dashboard fetched"
                )
        );
    }

    @GetMapping("/analytics")
    public ResponseEntity<ApiResponse<AnalyticsDTO>> getAnalytics() {
        return ResponseEntity.ok(
                ApiResponseUtil.success(
                        dashboardService.getAnalytics(),
                        "Analytics fetched"
                )
        );
    }

    @GetMapping("/analytical")
    public ResponseEntity<ApiResponse<AnalyticalDTO>> getAnalytical(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(
                ApiResponseUtil.success(
                        dashboardService.getAnalytical(from, to),
                        "Analytical dashboard fetched"
                )
        );
    }

    @GetMapping("/yearly")
    public ResponseEntity<ApiResponse<YearlyDTO>> getYearly(
            @RequestParam(required = false) Integer year) {
        int targetYear = year == null ? LocalDate.now().getYear() : year;
        return ResponseEntity.ok(
                ApiResponseUtil.success(
                        dashboardService.getYearly(targetYear),
                        "Yearly dashboard fetched"
                )
        );
    }
}