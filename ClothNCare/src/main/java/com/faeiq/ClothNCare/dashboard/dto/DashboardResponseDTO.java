package com.faeiq.ClothNCare.dashboard.dto;

import lombok.Data;

@Data
public class DashboardResponseDTO {
    private long todayOrders;
    private double todayRevenue;
    private long pendingOrders;
}