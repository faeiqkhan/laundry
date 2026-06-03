package com.faeiq.ClothNCare.dashboard.controller;

import com.faeiq.ClothNCare.common.ApiResponse;
import com.faeiq.ClothNCare.common.ApiResponseUtil;
import com.faeiq.ClothNCare.dashboard.dto.AnalyticsDTO;
import com.faeiq.ClothNCare.dashboard.dto.DashboardResponseDTO;
import com.faeiq.ClothNCare.dashboard.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/dashboard")
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
}