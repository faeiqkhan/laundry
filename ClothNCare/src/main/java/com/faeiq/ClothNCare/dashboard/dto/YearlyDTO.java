package com.faeiq.ClothNCare.dashboard.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
public class YearlyDTO {
    private int year;
    private double totalRevenue;
    private double totalPaid;
    private double totalExpenses;
    private double netProfit;
    private long totalOrders;
    private long totalDelivered;
    private double bestMonthRevenue;
    private String bestMonthName;
    private List<MonthPoint> months;

    @Data
    @AllArgsConstructor
    public static class MonthPoint {
        private int month;
        private String monthName;
        private double revenue;
        private double paid;
        private double expenses;
        private long orders;
    }
}
