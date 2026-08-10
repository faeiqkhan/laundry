package com.faeiq.ClothNCare.report.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
public class ReportsDTO {
    private BigDecimal totalRevenue;
    private long totalOrders;
    private long totalDelivered;
    private long totalCustomers;
    private BigDecimal totalPaid;
    private BigDecimal totalOutstanding;
    private BigDecimal totalExpenses;
    private BigDecimal netProfit;
    private Map<String, BigDecimal> revenueByService;
    private Map<String, Long> ordersByStatus;
    private List<TopCustomer> topCustomers;
    private List<PendingPayment> pendingPayments;
    private List<CategorySpend> expensesByCategory;

    @Data
    @AllArgsConstructor
    public static class TopCustomer {
        private String name;
        private String phone;
        private long orderCount;
        private BigDecimal totalSpent;
    }

    @Data
    @AllArgsConstructor
    public static class PendingPayment {
        private String orderId;
        private String invoiceNumber;
        private String customerName;
        private BigDecimal total;
        private BigDecimal paid;
        private BigDecimal due;
    }

    @Data
    @AllArgsConstructor
    public static class CategorySpend {
        private String category;
        private BigDecimal amount;
    }
}
