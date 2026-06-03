package com.faeiq.ClothNCare.dashboard.service;

import com.faeiq.ClothNCare.dashboard.dto.AnalyticsDTO;
import com.faeiq.ClothNCare.dashboard.dto.DashboardResponseDTO;
import com.faeiq.ClothNCare.orders.entity.Orders;
import com.faeiq.ClothNCare.orders.entity.OrdersItems;
import com.faeiq.ClothNCare.orders.repository.OrdersItemsRepository;
import com.faeiq.ClothNCare.orders.repository.OrdersRepository;
import com.faeiq.ClothNCare.customer.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final OrdersRepository ordersRepository;
    private final OrdersItemsRepository ordersItemsRepository;
    private final CustomerRepository customerRepository;

    public DashboardResponseDTO getSummary() {

        LocalDate today = LocalDate.now();

        List<Orders> orders = ordersRepository.findAll();

        long todayOrders = orders.stream()
                .filter(o -> o.getCreated_at().toLocalDate().equals(today))
                .count();

        double todayRevenue = orders.stream()
                .filter(o -> o.getCreated_at().toLocalDate().equals(today))
                .mapToDouble(o -> o.getTotal_price().doubleValue())
                .sum();

        long pendingOrders = orders.stream()
                .filter(o -> o.getStatus().name().equals("RECEIVED"))
                .count();

        DashboardResponseDTO dto = new DashboardResponseDTO();
        dto.setTodayOrders(todayOrders);
        dto.setTodayRevenue(todayRevenue);
        dto.setPendingOrders(pendingOrders);

        return dto;
    }

    public AnalyticsDTO getAnalytics() {
        List<Orders> orders = ordersRepository.findAll();
        List<OrdersItems> allItems = ordersItemsRepository.findAll();
        long totalCustomers = customerRepository.count();

        // Orders by status
        Map<String, Long> ordersByStatus = orders.stream()
                .collect(Collectors.groupingBy(o -> o.getStatus() != null ? o.getStatus().name() : "UNKNOWN", Collectors.counting()));

        // Revenue by service type
        Map<String, Double> revenueByService = allItems.stream()
                .filter(item -> item.getService_type() != null && item.getPrice() != null)
                .collect(Collectors.groupingBy(
                        OrdersItems::getService_type,
                        Collectors.summingDouble(item -> item.getPrice().doubleValue())
                ));

        // Daily revenue for last 7 days
        LocalDate today = LocalDate.now();
        List<AnalyticsDTO.DailyRevenue> dailyRevenue = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            LocalDate date = today.minusDays(i);
            String dateStr = date.format(DateTimeFormatter.ofPattern("EEE"));

            double revenue = orders.stream()
                    .filter(o -> o.getCreated_at() != null && o.getCreated_at().toLocalDate().equals(date))
                    .filter(o -> o.getTotal_price() != null)
                    .mapToDouble(o -> o.getTotal_price().doubleValue())
                    .sum();

            long dayOrders = orders.stream()
                    .filter(o -> o.getCreated_at() != null && o.getCreated_at().toLocalDate().equals(date))
                    .count();

            dailyRevenue.add(new AnalyticsDTO.DailyRevenue(dateStr, revenue, dayOrders));
        }

        // Total revenue and avg order value
        double totalRevenue = orders.stream()
                .filter(o -> o.getTotal_price() != null)
                .mapToDouble(o -> o.getTotal_price().doubleValue())
                .sum();

        double avgOrderValue = orders.isEmpty() ? 0 : totalRevenue / orders.size();

        // Conversion rate (delivered / total)
        long delivered = orders.stream()
                .filter(o -> o.getStatus() != null && o.getStatus().name().equals("DELIVERED"))
                .count();

        double conversionRate = orders.isEmpty() ? 0 : ((double) delivered / orders.size()) * 100;

        // Retention rate (customers with more than 1 order / total customers)
        Map<String, Long> ordersPerCustomer = orders.stream()
                .filter(o -> o.getCustomer() != null)
                .collect(Collectors.groupingBy(o -> o.getCustomer().getId(), Collectors.counting()));

        long returningCustomers = ordersPerCustomer.values().stream()
                .filter(count -> count > 1)
                .count();

        int retentionRate = totalCustomers == 0 ? 0 : (int) (((double) returningCustomers / totalCustomers) * 100);

        // Projected revenue (average daily revenue * 30)
        double avgDailyRevenue = orders.isEmpty() ? 0 : totalRevenue / Math.max(1, orders.stream()
                .filter(o -> o.getCreated_at() != null)
                .mapToLong(o -> o.getCreated_at().toLocalDate().toEpochDay())
                .distinct()
                .count());

        double projectedRevenue = avgDailyRevenue * 30;

        AnalyticsDTO dto = new AnalyticsDTO();
        dto.setOrdersByStatus(ordersByStatus);
        dto.setRevenueByService(revenueByService);
        dto.setDailyRevenue(dailyRevenue);
        dto.setTotalRevenue(totalRevenue);
        dto.setAvgOrderValue(avgOrderValue);
        dto.setConversionRate(conversionRate);
        dto.setTotalOrders(orders.size());
        dto.setTotalCustomers(totalCustomers);
        dto.setRetentionRate(retentionRate);
        dto.setProjectedRevenue(projectedRevenue);

        return dto;
    }
}
