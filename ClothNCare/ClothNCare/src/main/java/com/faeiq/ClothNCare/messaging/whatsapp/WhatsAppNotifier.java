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
import java.util.Map;

/**
 * Builds customer-facing notification messages and feeds them to the
 * WhatsAppMessagingService queue. Automatic notifications only fire when the
 * matching whatsAppAuto* setting is enabled (all OFF by default).
 */
@Service
@RequiredArgsConstructor
public class WhatsAppNotifier {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd MMM yyyy");

    private static final String TYPE_CUSTOMER_CREATED = "CUSTOMER_CREATED";
    private static final String TYPE_ORDER_CREATED = "ORDER_CREATED";
    private static final String TYPE_STATUS_CHANGED = "STATUS_CHANGED";
    private static final String TYPE_THANK_YOU = "THANK_YOU";

    private static final String DEFAULT_WELCOME =
            "Hi {name},\n\nWelcome to {business}!\n"
                    + "You have been added as a customer. You can now place orders and "
                    + "you will receive updates on your phone as your order progresses.\n\n"
                    + "Thank you for choosing {business}.";

    private static final String DEFAULT_THANK_YOU =
            "Hi {name},\n\nThank you for choosing {business}. "
                    + "Your order {invoice} has been received and is expected by {delivery}.\n\n"
                    + "- {business}";

    private final WhatsAppMessagingService messagingService;
    private final SettingsService settingsService;

    public void notifyCustomerCreated(Customer customer) {
        AppSettings settings = settingsService.getSettings();
        if (!settings.isWhatsAppAutoWelcome() || customer == null || isBlank(customer.getPhone())) {
            return;
        }
        String template = isBlank(settings.getWhatsAppWelcomeMessage())
                ? DEFAULT_WELCOME : settings.getWhatsAppWelcomeMessage();
        String body = renderMessage(template, Map.of(
                "name", safe(customer.getName()),
                "business", businessName(settings)));
        WhatsAppMessageRequest request = request(customer, WhatsAppMessageStatus.CAT_WELCOME,
                customer.getPhone(), body, settings.getWhatsAppWelcomeTemplate(),
                List.of(safe(customer.getName())));
        request.setMessageType(TYPE_CUSTOMER_CREATED);
        request.setBusinessKey("CUSTOMER:" + customer.getId());
        messagingService.submit(request);
    }

    public void notifyOrderThankYou(Orders order) {
        AppSettings settings = settingsService.getSettings();
        if (!settings.isWhatsAppAutoThankYou()
                || order == null || order.getCustomer() == null || isBlank(order.getCustomer().getPhone())) {
            return;
        }
        String template = isBlank(settings.getWhatsAppThankYouMessage())
                ? DEFAULT_THANK_YOU : settings.getWhatsAppThankYouMessage();
        String body = renderMessage(template, Map.of(
                "name", safe(order.getCustomer().getName()),
                "business", businessName(settings),
                "invoice", safe(order.getInvoice_number()),
                "delivery", order.getExpected_delivery_date() != null
                        ? order.getExpected_delivery_date().format(DATE_FMT) : "-"));
        WhatsAppMessageRequest request = request(order, WhatsAppMessageStatus.CAT_THANK_YOU,
                order.getCustomer().getPhone(), body, "",
                List.of());
        request.setMessageType(TYPE_THANK_YOU);
        request.setBusinessKey("ORDER:" + order.getId() + ":THANK_YOU");
        messagingService.submit(request);
    }

    public void notifyOrderCreated(Orders order) {
        AppSettings settings = settingsService.getSettings();
        if (!settings.isWhatsAppAutoInvoice()
                || order == null || order.getCustomer() == null || isBlank(order.getCustomer().getPhone())) {
            return;
        }
        String body = buildInvoiceText(order, settings);
        WhatsAppMessageRequest request = request(order, WhatsAppMessageStatus.CAT_INVOICE,
                order.getCustomer().getPhone(), body, settings.getWhatsAppInvoiceTemplate(),
                List.of(
                        safe(order.getCustomer().getName()),
                        safe(order.getInvoice_number()),
                        fmt(order.getTotal_price()),
                        order.getExpected_delivery_date() != null
                                ? order.getExpected_delivery_date().format(DATE_FMT) : "-"));
        request.setMessageType(TYPE_ORDER_CREATED);
        request.setBusinessKey("ORDER:" + order.getId() + ":INVOICE");
        messagingService.submit(request);
    }

    public void notifyStatusChanged(Orders order, Status previous) {
        AppSettings settings = settingsService.getSettings();
        if (!settings.isWhatsAppAutoStatus()
                || order == null || order.getCustomer() == null || isBlank(order.getCustomer().getPhone())) {
            return;
        }
        if (previous == order.getStatus()) {
            return;
        }
        StringBuilder body = new StringBuilder();
        if (!isBlank(settings.getWhatsAppStatusMessage())) {
            body.append(renderMessage(settings.getWhatsAppStatusMessage(), Map.of(
                    "name", safe(order.getCustomer().getName()),
                    "business", businessName(settings),
                    "invoice", safe(order.getInvoice_number()),
                    "status", order.getStatus().name(),
                    "message", statusLine(order.getStatus()),
                    "delivery", order.getStatus() == Status.READY && order.getExpected_delivery_date() != null
                            ? order.getExpected_delivery_date().format(DATE_FMT) : "-")));
            String fullBody = body.toString();
            WhatsAppMessageRequest request = request(order, WhatsAppMessageStatus.CAT_STATUS,
                    order.getCustomer().getPhone(), fullBody, settings.getWhatsAppStatusTemplate(),
                    List.of(
                            safe(order.getCustomer().getName()),
                            safe(order.getInvoice_number()),
                            order.getStatus().name()));
            request.setMessageType(TYPE_STATUS_CHANGED);
            request.setBusinessKey("ORDER:" + order.getId() + ":" + order.getStatus());
            messagingService.submit(request);
            return;
        }
        body.append("Hi ").append(safe(order.getCustomer().getName())).append(",\n\n");
        body.append("Update on your order ").append(safe(order.getInvoice_number())).append(":\n");
        body.append(statusLine(order.getStatus())).append("\n\n");
        body.append("Current status: ").append(order.getStatus());
        if (order.getStatus() == Status.READY && order.getExpected_delivery_date() != null) {
            body.append("\nReady for delivery from ").append(order.getExpected_delivery_date().format(DATE_FMT));
        }
        body.append("\n\n").append(businessName(settings));
        WhatsAppMessageRequest request = request(order, WhatsAppMessageStatus.CAT_STATUS,
                order.getCustomer().getPhone(), body.toString(), settings.getWhatsAppStatusTemplate(),
                List.of(
                        safe(order.getCustomer().getName()),
                        safe(order.getInvoice_number()),
                        order.getStatus().name()));
        request.setMessageType(TYPE_STATUS_CHANGED);
        request.setBusinessKey("ORDER:" + order.getId() + ":" + order.getStatus());
        messagingService.submit(request);
    }

    private WhatsAppMessageRequest request(Customer customer, String category, String to, String body,
                                           String templateName, List<String> templateParams) {
        WhatsAppMessageRequest request = new WhatsAppMessageRequest(category, to, body);
        request.setTemplateName(templateName);
        request.setTemplateParams(templateParams);
        request.setCustomerId(customer.getId());
        return request;
    }

    private WhatsAppMessageRequest request(Orders order, String category, String to, String body,
                                           String templateName, List<String> templateParams) {
        WhatsAppMessageRequest request = new WhatsAppMessageRequest(category, to, body);
        request.setTemplateName(templateName);
        request.setTemplateParams(templateParams);
        request.setCustomerId(order.getCustomer() != null ? order.getCustomer().getId() : null);
        request.setOrderId(order.getId());
        request.setInvoiceId(order.getInvoice_number());
        return request;
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
        if (order.getItems() != null) {
            for (OrdersItems item : order.getItems()) {
            String desc = (item.getProduct_name() != null ? item.getProduct_name() : item.getService_type())
                    + (item.getProduct_type() != null ? " - " + item.getProduct_type() : "");
            BigDecimal lineTotal = item.getLineTotal().setScale(2, RoundingMode.HALF_UP);
            subtotal = subtotal.add(lineTotal);
            sb.append("- ").append(desc)
                    .append(" x").append(fmtQty(item.getQuantity()))
                    .append(" = ").append(symbol).append(fmt(lineTotal)).append("\n");
            }
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

    private String renderMessage(String template, Map<String, String> variables) {
        if (isBlank(template)) {
            return "";
        }
        String text = template;
        for (Map.Entry<String, String> entry : variables.entrySet()) {
            text = text.replace("{" + entry.getKey() + "}", safe(entry.getValue()));
        }
        return text;
    }

    private String businessName(AppSettings settings) {
        return isBlank(settings.getBusinessName()) ? "Cloth & Care" : settings.getBusinessName();
    }

    private String fmt(BigDecimal value) {
        if (value == null) {
            return "0.00";
        }
        return value.setScale(2, RoundingMode.HALF_UP).toPlainString();
    }

    private String fmtQty(BigDecimal value) {
        if (value == null) {
            return "0";
        }
        BigDecimal stripped = value.stripTrailingZeros();
        if (stripped.scale() <= 0) {
            return stripped.toBigInteger().toString();
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
