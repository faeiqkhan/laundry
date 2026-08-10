package com.faeiq.ClothNCare.report.service;

import com.faeiq.ClothNCare.customer.repository.CustomerRepository;
import com.faeiq.ClothNCare.expense.entity.Expense;
import com.faeiq.ClothNCare.expense.repository.ExpenseRepository;
import com.faeiq.ClothNCare.orders.entity.Orders;
import com.faeiq.ClothNCare.orders.entity.OrdersItems;
import com.faeiq.ClothNCare.orders.repository.OrdersItemsRepository;
import com.faeiq.ClothNCare.orders.repository.OrdersRepository;
import com.faeiq.ClothNCare.report.dto.ReportsDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReportsService {

    private final OrdersRepository ordersRepository;
    private final OrdersItemsRepository ordersItemsRepository;
    private final CustomerRepository customerRepository;
    private final ExpenseRepository expenseRepository;

    @Transactional(readOnly = true)
    public ReportsDTO getReports(LocalDate from, LocalDate to) {
        LocalDate start = from == null ? LocalDate.now().minusDays(30) : from;
        LocalDate end = to == null ? LocalDate.now() : to;
        LocalDateTime startTime = start.atStartOfDay();
        LocalDateTime endTime = end.plusDays(1).atStartOfDay();

        List<Orders> orders = ordersRepository.findAll().stream()
                .filter(o -> o.getCreated_at() != null)
                .filter(o -> !o.getCreated_at().isBefore(startTime) && o.getCreated_at().isBefore(endTime))
                .toList();

        List<Orders> allOrders = ordersRepository.findAll();
        List<Expense> expenses = expenseRepository.findByExpenseDateBetween(start, end);

        BigDecimal totalRevenue = orders.stream()
                .filter(o -> o.getTotal_price() != null)
                .map(Orders::getTotal_price)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal totalPaid = orders.stream()
                .filter(o -> o.getPaid_amount() != null)
                .map(Orders::getPaid_amount)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal totalOutstanding = totalRevenue.subtract(totalPaid).max(BigDecimal.ZERO);

        BigDecimal totalExpenses = expenses.stream()
                .map(Expense::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        long totalOrders = orders.size();
        long totalDelivered = orders.stream()
                .filter(o -> o.getStatus() != null && o.getStatus().name().equals("DELIVERED"))
                .count();
        long totalCustomers = customerRepository.count();

        List<OrdersItems> rangeItems = ordersItemsRepository.findAll().stream()
                .filter(item -> item.getOrders() != null && item.getOrders().getCreated_at() != null)
                .filter(item -> !item.getOrders().getCreated_at().isBefore(startTime)
                        && item.getOrders().getCreated_at().isBefore(endTime))
                .toList();

        Map<String, BigDecimal> revenueByService = rangeItems.stream()
                .filter(item -> item.getService_type() != null && item.getPrice() != null)
                .collect(Collectors.groupingBy(
                        OrdersItems::getService_type,
                        Collectors.mapping(
                                item -> item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity())),
                                Collectors.reducing(BigDecimal.ZERO, BigDecimal::add)
                        )
                ));

        Map<String, Long> ordersByStatus = orders.stream()
                .filter(o -> o.getStatus() != null)
                .collect(Collectors.groupingBy(
                        o -> o.getStatus().name(),
                        Collectors.counting()
                ));

        Map<String, BigDecimal> customerTotals = new LinkedHashMap<>();
        for (Orders order : allOrders) {
            if (order.getCustomer() == null || order.getTotal_price() == null) {
                continue;
            }
            String key = order.getCustomer().getName() + "|" + order.getCustomer().getId();
            customerTotals.merge(key, order.getTotal_price(), BigDecimal::add);
        }

        List<ReportsDTO.TopCustomer> topCustomers = customerTotals.entrySet().stream()
                .map(e -> {
                    String[] parts = e.getKey().split("\\|");
                    String name = parts[0];
                    String customerId = parts[1];
                    long orderCount = allOrders.stream()
                            .filter(o -> o.getCustomer() != null && o.getCustomer().getId().equals(customerId))
                            .count();
                    return new ReportsDTO.TopCustomer(name, "", orderCount, e.getValue());
                })
                .sorted(Comparator.comparing(ReportsDTO.TopCustomer::getTotalSpent).reversed())
                .limit(10)
                .toList();

        List<ReportsDTO.PendingPayment> pendingPayments = allOrders.stream()
                .filter(o -> o.getStatus() != null && !o.getStatus().name().equals("CANCELLED"))
                .filter(o -> o.getBalanceDue().compareTo(BigDecimal.ZERO) > 0)
                .sorted(Comparator.comparing(Orders::getBalanceDue).reversed())
                .limit(10)
                .map(o -> new ReportsDTO.PendingPayment(
                        o.getId(),
                        o.getInvoice_number(),
                        o.getCustomer() != null ? o.getCustomer().getName() : null,
                        o.getTotal_price(),
                        o.getPaid_amount(),
                        o.getBalanceDue()
                ))
                .toList();

        Map<String, BigDecimal> expensesByCategory = expenses.stream()
                .filter(e -> e.getCategory() != null && e.getAmount() != null)
                .collect(Collectors.groupingBy(
                        Expense::getCategory,
                        Collectors.mapping(
                                Expense::getAmount,
                                Collectors.reducing(BigDecimal.ZERO, BigDecimal::add)
                        )
                ));

        List<ReportsDTO.CategorySpend> expenseList = expensesByCategory.entrySet().stream()
                .map(e -> new ReportsDTO.CategorySpend(e.getKey(), e.getValue()))
                .sorted(Comparator.comparing(ReportsDTO.CategorySpend::getAmount).reversed())
                .toList();

        ReportsDTO dto = new ReportsDTO();
        dto.setTotalRevenue(totalRevenue);
        dto.setTotalOrders(totalOrders);
        dto.setTotalDelivered(totalDelivered);
        dto.setTotalCustomers(totalCustomers);
        dto.setTotalPaid(totalPaid);
        dto.setTotalOutstanding(totalOutstanding);
        dto.setTotalExpenses(totalExpenses);
        dto.setNetProfit(totalPaid.subtract(totalExpenses));
        dto.setRevenueByService(revenueByService);
        dto.setOrdersByStatus(ordersByStatus);
        dto.setTopCustomers(topCustomers);
        dto.setPendingPayments(pendingPayments);
        dto.setExpensesByCategory(expenseList);

        return dto;
    }
}
