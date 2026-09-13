package com.faeiq.ClothNCare.messaging.whatsapp;

import com.faeiq.ClothNCare.customer.entity.Customer;
import com.faeiq.ClothNCare.orders.entity.Orders;
import com.faeiq.ClothNCare.orders.entity.OrdersItems;
import com.faeiq.ClothNCare.orders.entity.Status;
import com.faeiq.ClothNCare.settings.entity.AppSettings;
import com.faeiq.ClothNCare.settings.service.SettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class WhatsAppNotifier {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd MMM yyyy");

    private final WhatsAppService whatsAppService;
    private final SettingsService settingsService;

    public void notifyCustomerCreated(Customer customer) {
        if (customer == null || isBlank(customer.getPhone())) {
            return;
        }
        AppSettings settings = settingsService.getSettings();
        String body = "Hi " + safe(customer.getName()) + ",\n\n"
                + "Welcome to " + businessName(settings) + "!\n"
                + "You have been added as a customer. You can now place orders and "
                + "you will receive updates on your phone as your order progresses.\n\n"
                + "Thank you for choosing " + businessName(settings) + ".";
        whatsAppService.send(WhatsAppService.CAT_WELCOME, customer.getPhone(), body,
                settings.getWhatsAppWelcomeTemplate(), List.of(safe(customer.getName())));
    }

    public void notifyOrderCreated(Orders order) {
        if (order == null || order.getCustomer() == null || isBlank(order.getCustomer().getPhone())) {
            return;
        }
        AppSettings settings = settingsService.getSettings();
        String body = buildInvoiceText(order, settings);
        whatsAppService.send(WhatsAppService.CAT_INVOICE, order.getCustomer().getPhone(), body,
                settings.getWhatsAppInvoiceTemplate(),
                List.of(
                        safe(order.getCustomer().getName()),
                        safe(order.getInvoice_number()),
                        fmt(order.getTotal_price()),
                        order.getExpected_delivery_date() != null
                                ? order.getExpected_delivery_date().format(DATE_FMT) : "-"));
    }

    public void notifyStatusChanged(Orders order, Status previous) {
        if (order == null || order.getCustomer() == null || isBlank(order.getCustomer().getPhone())) {
            return;
        }
        if (previous == order.getStatus()) {
            return;
        }
        AppSettings settings = settingsService.getSettings();
        StringBuilder body = new StringBuilder();
        body.append("Hi ").append(safe(order.getCustomer().getName())).append(",\n\n");
        body.append("Update on your order ").append(safe(order.getInvoice_number())).append(":\n");
        body.append(statusLine(order.getStatus())).append("\n\n");
        body.append("Current status: ").append(order.getStatus());
        if (order.getStatus() == Status.READY && order.getExpected_delivery_date() != null) {
            body.append("\nReady for delivery from ").append(order.getExpected_delivery_date().format(DATE_FMT));
        }
        body.append("\n\n").append(businessName(settings));
        whatsAppService.send(WhatsAppService.CAT_STATUS, order.getCustomer().getPhone(), body.toString(),
                settings.getWhatsAppStatusTemplate(),
                List.of(
                        safe(order.getCustomer().getName()),
                        safe(order.getInvoice_number()),
                        order.getStatus().name()));
    }

    private String buildInvoiceText(Orders order, AppSettings settings) {
        String currency = isBlank(settings.getCurrencyCode()) ? "INR" : settings.getCurrencyCode();
        String symbol = isBlank(settings.getCurrencySymbol()) ? currency + " " : settings.getCurrencySymbol();

        StringBuilder sb = new StringBuilder();
        sb.append("*").append(businessName(settings)).append("* - INVOICE\n");
        sb.append("Invoice No: ").append(safe(order.getInvoice_number())).append("\n");
        if (order.getCreated_at() != null) {
            sb.append("Date: ").append(order.getCreated_at().format(DATE_FMT)).append("\n");
        }
        if (order.getCustomer() != null) {
            sb.append("Customer: ").append(safe(order.getCustomer().getName())).append("\n");
        }
        sb.append("\n*Items*\n");

        BigDecimal subtotal = BigDecimal.ZERO;
        for (OrdersItems item : order.getItems()) {
            String desc = item.getService_type()
                    + (item.getProduct_type() != null ? " - " + item.getProduct_type() : "");
            BigDecimal lineTotal = item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity()))
                    .setScale(2, RoundingMode.HALF_UP);
            subtotal = subtotal.add(lineTotal);
            sb.append("- ").append(desc)
                    .append(" x").append(item.getQuantity())
                    .append(" = ").append(symbol).append(fmt(lineTotal)).append("\n");
        }

        sb.append("\nSubtotal: ").append(symbol).append(fmt(subtotal)).append("\n");
        if (order.getDiscount() != null && order.getDiscount().compareTo(BigDecimal.ZERO) > 0) {
            sb.append("Discount: -").append(symbol).append(fmt(order.getDiscount())).append("\n");
        }
        if (order.getTax_amount() != null && order.getTax_amount().compareTo(BigDecimal.ZERO) > 0) {
            sb.append("Tax: ").append(symbol).append(fmt(order.getTax_amount())).append("\n");
        }
        sb.append("*Grand Total: ").append(symbol).append(fmt(order.getTotal_price())).append("*\n");
        if (order.getPaid_amount() != null && order.getPaid_amount().compareTo(BigDecimal.ZERO) > 0) {
            sb.append("Paid: ").append(symbol).append(fmt(order.getPaid_amount())).append("\n");
        }
        sb.append("Balance Due: ").append(symbol).append(fmt(order.getBalanceDue())).append("\n");

        if (order.getExpected_delivery_date() != null) {
            sb.append("\nExpected Delivery: ").append(order.getExpected_delivery_date().format(DATE_FMT)).append("\n");
        }
        sb.append("Status: ").append(order.getStatus()).append("\n\n");
        sb.append("Thank you for your business!");
        return sb.toString();
    }

    private String statusLine(Status status) {
        return switch (status) {
            case RECEIVED -> "We have received your clothes.";
            case PROCESSING -> "Your order is now being processed.";
            case WASHING -> "Your clothes are currently being washed.";
            case DRYING -> "Your clothes are being dried.";
            case IRONING -> "Your clothes are now being ironed.";
            case FOLDED -> "Your clothes are folded and packed.";
            case READY -> "Your order is ready for delivery.";
            case DELIVERED -> "Your order has been delivered. Thank you!";
            case CANCELLED -> "Your order has been cancelled.";
        };
    }

    private String businessName(AppSettings settings) {
        return isBlank(settings.getBusinessName()) ? "Cloth n Care" : settings.getBusinessName();
    }

    private String fmt(BigDecimal value) {
        if (value == null) {
            return "0.00";
        }
        return value.setScale(2, RoundingMode.HALF_UP).toPlainString();
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}