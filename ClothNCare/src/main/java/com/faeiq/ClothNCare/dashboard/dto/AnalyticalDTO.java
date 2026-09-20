package com.faeiq.ClothNCare.dashboard.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class AnalyticalDTO {
    private double totalRevenue;
    private double totalPaid;
    private double totalOutstanding;
    private double totalExpenses;
    private double netProfit;
    private double avgOrderValue;
    private long totalOrders;
    private long totalDelivered;
    private long totalCustomers;
    private Map<String, Long> ordersByStatus;
    private Map<String, Double> revenueByService;
    private Map<String, Double> paymentByMethod;
    private List<DailyPoint> dailyRevenue;
    private List<CategorySpend> expensesByCategory;
    private List<TopCustomer> topCustomers;

    @Data
    @AllArgsConstructor
    public static class DailyPoint {
        private String date;
        private double revenue;
        private long orders;
        private double paid;
    }

    @Data
    @AllArgsConstructor
    public static class CategorySpend {
        private String category;
        private double amount;
    }

    @Data
    @AllArgsConstructor
    public static class TopCustomer {
        private String name;
        private String phone;
        private long orderCount;
        private double totalSpent;
    }
}
