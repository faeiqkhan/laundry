package com.faeiq.ClothNCare.dashboard.service;

import com.faeiq.ClothNCare.dashboard.dto.AnalyticsDTO;
import com.faeiq.ClothNCare.dashboard.dto.AnalyticalDTO;
import com.faeiq.ClothNCare.dashboard.dto.DashboardResponseDTO;
import com.faeiq.ClothNCare.dashboard.dto.YearlyDTO;
import com.faeiq.ClothNCare.expense.entity.Expense;
import com.faeiq.ClothNCare.expense.repository.ExpenseRepository;
import com.faeiq.ClothNCare.orders.entity.Orders;
import com.faeiq.ClothNCare.orders.entity.OrdersItems;
import com.faeiq.ClothNCare.orders.entity.Payment;
import com.faeiq.ClothNCare.orders.repository.OrdersItemsRepository;
import com.faeiq.ClothNCare.orders.repository.OrdersRepository;
import com.faeiq.ClothNCare.orders.repository.PaymentRepository;
import com.faeiq.ClothNCare.customer.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.Month;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final OrdersRepository ordersRepository;
    private final OrdersItemsRepository ordersItemsRepository;
    private final CustomerRepository customerRepository;
    private final ExpenseRepository expenseRepository;
    private final PaymentRepository paymentRepository;

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

    @Transactional(readOnly = true)
    public AnalyticalDTO getAnalytical(LocalDate from, LocalDate to) {
        LocalDate start = from == null ? LocalDate.now().minusDays(29) : from;
        LocalDate end = to == null ? LocalDate.now() : to;
        if (start.isAfter(end)) {
            LocalDate swap = start;
            start = end;
            end = swap;
        }
        final LocalDate fromDate = start;
        final LocalDate toDate = end;

        List<Orders> orders = ordersRepository.findAll().stream()
                .filter(o -> o.getCreated_at() != null)
                .filter(o -> !o.getCreated_at().toLocalDate().isBefore(fromDate)
                        && !o.getCreated_at().toLocalDate().isAfter(toDate))
                .toList();

        List<Payment> payments = paymentRepository.findAll().stream()
                .filter(p -> p.getPaidAt() != null)
                .filter(p -> !p.getPaidAt().toLocalDate().isBefore(fromDate)
                        && !p.getPaidAt().toLocalDate().isAfter(toDate))
                .toList();

        List<Expense> expenses = expenseRepository.findAll().stream()
                .filter(e -> e.getExpenseDate() != null)
                .filter(e -> !e.getExpenseDate().isBefore(fromDate) && !e.getExpenseDate().isAfter(toDate))
                .toList();

        List<OrdersItems> allItems = ordersItemsRepository.findAll();

        double totalRevenue = sumOrderRevenue(orders);
        double totalPaid = payments.stream()
                .filter(p -> p.getAmount() != null)
                .mapToDouble(p -> p.getAmount().doubleValue())
                .sum();
        double totalOutstanding = Math.max(0, totalRevenue - totalPaid);
        double totalExpenses = expenses.stream()
                .filter(e -> e.getAmount() != null)
                .mapToDouble(e -> e.getAmount().doubleValue())
                .sum();
        double avgOrderValue = orders.isEmpty() ? 0 : totalRevenue / orders.size();

        long totalDelivered = orders.stream()
                .filter(o -> o.getStatus() != null && o.getStatus().name().equals("DELIVERED"))
                .count();

        Map<String, Long> ordersByStatus = orders.stream()
                .filter(o -> o.getStatus() != null)
                .collect(Collectors.groupingBy(o -> o.getStatus().name(), Collectors.counting()));

        Map<String, Double> revenueByService = allItems.stream()
                .filter(item -> item.getOrders() != null && item.getOrders().getCreated_at() != null)
                .filter(item -> !item.getOrders().getCreated_at().toLocalDate().isBefore(fromDate)
                        && !item.getOrders().getCreated_at().toLocalDate().isAfter(toDate))
                .filter(item -> item.getService_type() != null && item.getPrice() != null)
                .collect(Collectors.groupingBy(
                        OrdersItems::getService_type,
                        Collectors.summingDouble(item -> item.getPrice().doubleValue() * item.getQuantity())
                ));

        Map<String, Double> paymentByMethod = payments.stream()
                .filter(p -> p.getMethod() != null)
                .collect(Collectors.groupingBy(
                        p -> p.getMethod().name(),
                        Collectors.summingDouble(p -> p.getAmount() == null ? 0 : p.getAmount().doubleValue())
                ));

        DateTimeFormatter dayFmt = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        List<AnalyticalDTO.DailyPoint> dailyRevenue = new ArrayList<>();
        for (LocalDate date = start; !date.isAfter(end); date = date.plusDays(1)) {
            LocalDate day = date;
            double revenue = orders.stream()
                    .filter(o -> o.getCreated_at().toLocalDate().equals(day))
                    .filter(o -> o.getTotal_price() != null)
                    .mapToDouble(o -> o.getTotal_price().doubleValue())
                    .sum();
            long dayOrders = orders.stream()
                    .filter(o -> o.getCreated_at().toLocalDate().equals(day))
                    .count();
            double dayPaid = payments.stream()
                    .filter(p -> p.getPaidAt().toLocalDate().equals(day))
                    .mapToDouble(p -> p.getAmount() == null ? 0 : p.getAmount().doubleValue())
                    .sum();
            dailyRevenue.add(new AnalyticalDTO.DailyPoint(day.format(dayFmt), revenue, dayOrders, dayPaid));
        }

        Map<String, Double> expenseByCategory = expenses.stream()
                .filter(e -> e.getCategory() != null && e.getAmount() != null)
                .collect(Collectors.groupingBy(
                        Expense::getCategory,
                        Collectors.summingDouble(e -> e.getAmount().doubleValue())
                ));

        List<AnalyticalDTO.CategorySpend> expensesByCategory = expenseByCategory.entrySet().stream()
                .map(e -> new AnalyticalDTO.CategorySpend(e.getKey(), e.getValue()))
                .sorted(Comparator.comparingDouble(AnalyticalDTO.CategorySpend::getAmount).reversed())
                .toList();

        Map<String, Double> customerTotals = new LinkedHashMap<>();
        for (Orders order : orders) {
            if (order.getCustomer() == null || order.getTotal_price() == null) {
                continue;
            }
            String key = order.getCustomer().getId();
            customerTotals.merge(key, order.getTotal_price().doubleValue(), Double::sum);
        }

        List<AnalyticalDTO.TopCustomer> topCustomers = customerTotals.entrySet().stream()
                .map(e -> {
                    String customerId = e.getKey();
                    long orderCount = orders.stream()
                            .filter(o -> o.getCustomer() != null && o.getCustomer().getId().equals(customerId))
                            .count();
                    var customer = orders.stream()
                            .map(Orders::getCustomer)
                            .filter(Objects::nonNull)
                            .filter(c -> c.getId().equals(customerId))
                            .findFirst().orElse(null);
                    return new AnalyticalDTO.TopCustomer(
                            customer != null ? customer.getName() : "Unknown",
                            customer != null && customer.getPhone() != null ? customer.getPhone() : "",
                            orderCount,
                            e.getValue());
                })
                .sorted(Comparator.comparingDouble(AnalyticalDTO.TopCustomer::getTotalSpent).reversed())
                .limit(10)
                .toList();

        AnalyticalDTO dto = new AnalyticalDTO();
        dto.setTotalRevenue(totalRevenue);
        dto.setTotalPaid(totalPaid);
        dto.setTotalOutstanding(totalOutstanding);
        dto.setTotalExpenses(totalExpenses);
        dto.setNetProfit(totalPaid - totalExpenses);
        dto.setAvgOrderValue(avgOrderValue);
        dto.setTotalOrders(orders.size());
        dto.setTotalDelivered(totalDelivered);
        dto.setTotalCustomers(customerRepository.count());
        dto.setOrdersByStatus(ordersByStatus);
        dto.setRevenueByService(revenueByService);
        dto.setPaymentByMethod(paymentByMethod);
        dto.setDailyRevenue(dailyRevenue);
        dto.setExpensesByCategory(expensesByCategory);
        dto.setTopCustomers(topCustomers);
        return dto;
    }

    @Transactional(readOnly = true)
    public YearlyDTO getYearly(int year) {
        List<Orders> orders = ordersRepository.findAll().stream()
                .filter(o -> o.getCreated_at() != null && o.getCreated_at().getYear() == year)
                .toList();
        List<Payment> payments = paymentRepository.findAll().stream()
                .filter(p -> p.getPaidAt() != null && p.getPaidAt().getYear() == year)
                .toList();
        List<Expense> expenses = expenseRepository.findAll().stream()
                .filter(e -> e.getExpenseDate() != null && e.getExpenseDate().getYear() == year)
                .toList();

        String[] monthNames = {"January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"};

        List<YearlyDTO.MonthPoint> months = new ArrayList<>();
        double bestMonthRevenue = 0;
        String bestMonthName = "-";
        for (int m = 1; m <= 12; m++) {
            int month = m;
            double revenue = orders.stream()
                    .filter(o -> o.getCreated_at().getMonthValue() == month)
                    .filter(o -> o.getTotal_price() != null)
                    .mapToDouble(o -> o.getTotal_price().doubleValue())
                    .sum();
            double paid = payments.stream()
                    .filter(p -> p.getPaidAt().getMonthValue() == month)
                    .mapToDouble(p -> p.getAmount() == null ? 0 : p.getAmount().doubleValue())
                    .sum();
            double exp = expenses.stream()
                    .filter(e -> e.getExpenseDate().getMonthValue() == month)
                    .mapToDouble(e -> e.getAmount() == null ? 0 : e.getAmount().doubleValue())
                    .sum();
            long count = orders.stream()
                    .filter(o -> o.getCreated_at().getMonthValue() == month)
                    .count();
            months.add(new YearlyDTO.MonthPoint(month, monthNames[month - 1], revenue, paid, exp, count));
            if (revenue > bestMonthRevenue) {
                bestMonthRevenue = revenue;
                bestMonthName = monthNames[month - 1];
            }
        }

        double totalRevenue = months.stream().mapToDouble(YearlyDTO.MonthPoint::getRevenue).sum();
        double totalPaid = months.stream().mapToDouble(YearlyDTO.MonthPoint::getPaid).sum();
        double totalExpenses = months.stream().mapToDouble(YearlyDTO.MonthPoint::getExpenses).sum();
        long totalDelivered = orders.stream()
                .filter(o -> o.getStatus() != null && o.getStatus().name().equals("DELIVERED"))
                .count();

        YearlyDTO dto = new YearlyDTO();
        dto.setYear(year);
        dto.setTotalRevenue(totalRevenue);
        dto.setTotalPaid(totalPaid);
        dto.setTotalExpenses(totalExpenses);
        dto.setNetProfit(totalPaid - totalExpenses);
        dto.setTotalOrders(orders.size());
        dto.setTotalDelivered(totalDelivered);
        dto.setBestMonthRevenue(bestMonthRevenue);
        dto.setBestMonthName(bestMonthName);
        dto.setMonths(months);
        return dto;
    }

    private double sumOrderRevenue(List<Orders> orders) {
        return orders.stream()
                .filter(o -> o.getTotal_price() != null)
                .mapToDouble(o -> o.getTotal_price().doubleValue())
                .sum();
    }
}
