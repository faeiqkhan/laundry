package com.faeiq.ClothNCare.dashboard.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class AnalyticsDTO {
    private Map<String, Long> ordersByStatus;
    private Map<String, Double> revenueByService;
    private List<DailyRevenue> dailyRevenue;
    private double totalRevenue;
    private double avgOrderValue;
    private double conversionRate;
    private long totalOrders;
    private long totalCustomers;
    private int retentionRate;
    private double projectedRevenue;

    @Data
    @AllArgsConstructor
    public static class DailyRevenue {
        private String date;
        private double revenue;
        private long orders;
    }
}