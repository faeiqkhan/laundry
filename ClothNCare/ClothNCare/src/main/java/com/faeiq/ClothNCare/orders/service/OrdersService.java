package com.faeiq.ClothNCare.orders.service;

import com.faeiq.ClothNCare.LaundryService.service.LaundryServiceService;
import com.faeiq.ClothNCare.billing.service.InvoiceService;
import com.faeiq.ClothNCare.common.exception.BadRequestException;
import com.faeiq.ClothNCare.common.exception.ResourceNotFoundException;
import com.faeiq.ClothNCare.customer.entity.Customer;
import com.faeiq.ClothNCare.customer.repository.CustomerRepository;
import com.faeiq.ClothNCare.messaging.whatsapp.WhatsAppNotifier;
import com.faeiq.ClothNCare.orders.dto.OrderDTO;
import com.faeiq.ClothNCare.orders.dto.OrderItemResponseDTO;
import com.faeiq.ClothNCare.orders.dto.OrderItemsDTO;
import com.faeiq.ClothNCare.orders.dto.OrderResponseDTO;
import com.faeiq.ClothNCare.orders.dto.PaymentRequestDTO;
import com.faeiq.ClothNCare.orders.dto.PaymentResponseDTO;
import com.faeiq.ClothNCare.orders.entity.Orders;
import com.faeiq.ClothNCare.orders.entity.OrdersItems;
import com.faeiq.ClothNCare.orders.entity.Payment;
import com.faeiq.ClothNCare.orders.entity.Status;
import com.faeiq.ClothNCare.orders.repository.OrdersRepository;
import com.faeiq.ClothNCare.orders.repository.PaymentRepository;
import com.faeiq.ClothNCare.orders.dto.PaymentRecordDTO;
import com.faeiq.ClothNCare.settings.service.SettingsService;
import com.faeiq.ClothNCare.user.entity.Users;
import com.faeiq.ClothNCare.user.repository.UsersRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class OrdersService {

    private final CustomerRepository customerRepository;
    private final OrdersRepository ordersRepository;
    private final PaymentRepository paymentRepository;
    private final UsersRepository usersRepository;
    private final LaundryServiceService laundryServiceService;
    private final InvoiceService invoiceService;
    private final SettingsService settingsService;
    private final WhatsAppNotifier whatsAppNotifier;

    @Transactional
    public OrderResponseDTO createOrder(OrderDTO orderDTO) {
        validateOrder(orderDTO);

        Customer customer = findCustomer(orderDTO);

        if (customer == null) {
            throw new ResourceNotFoundException("Customer not found");
        }

        Orders order = new Orders();
        order.setCustomer(customer);
        order.setCreatedBy(getCurrentUser());
        order.setStatus(Status.RECEIVED);
        order.setExpected_delivery_date(orderDTO.getExpectedDeliveryDate() == null
                ? java.time.LocalDate.now() : orderDTO.getExpectedDeliveryDate());
        order.setCreated_at(LocalDateTime.now());

        List<OrdersItems> items = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;

        for (OrderItemsDTO itemDTO : orderDTO.getItems()) {
            BigDecimal unitPrice = itemDTO.getUnitPrice() != null && itemDTO.getUnitPrice().compareTo(BigDecimal.ZERO) > 0
                    ? itemDTO.getUnitPrice()
                    : laundryServiceService.getPrice(itemDTO.getServiceType(), itemDTO.getProductType());

            OrdersItems item = new OrdersItems();
            item.setOrders(order);
            item.setService_type(itemDTO.getServiceType());
            item.setProduct_type(itemDTO.getProductType());
            item.setQuantity(itemDTO.getQuantity());
            item.setPrice(unitPrice);

            subtotal = subtotal.add(unitPrice.multiply(BigDecimal.valueOf(itemDTO.getQuantity())));
            items.add(item);
        }

        BigDecimal discount = normalize(orderDTO.getDiscount());
        if (discount.compareTo(subtotal) > 0) {
            discount = subtotal;
        }
        BigDecimal taxRate = settingsService.getSettings().getTaxRate() == null
                ? BigDecimal.ZERO : settingsService.getSettings().getTaxRate();
        BigDecimal taxAmount = subtotal.subtract(discount)
                .multiply(taxRate.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP))
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal grandTotal = subtotal.subtract(discount).add(taxAmount).setScale(2, RoundingMode.HALF_UP);

        order.setDiscount(discount);
        order.setTax_amount(taxAmount);
        order.setPaid_amount(BigDecimal.ZERO);
        order.setTotal_price(grandTotal);
        order.setItems(items);
        order.setInvoice_number(settingsService.nextInvoiceNumber());

        Orders savedOrder = ordersRepository.save(order);
        String invoiceUrl = invoiceService.generateInvoice(savedOrder.getId()).getInvoiceUrl();

        whatsAppNotifier.notifyOrderCreated(savedOrder);

        return toResponse(savedOrder, invoiceUrl);
    }

    @Transactional
    public OrderResponseDTO updateStatus(String orderId, Status status) {
        Orders order = ordersRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        Status current = order.getStatus();
        if (current == Status.DELIVERED || current == Status.CANCELLED) {
            throw new BadRequestException("A " + current + " order cannot be changed");
        }
        if (status == null) {
            throw new BadRequestException("Status is required");
        }
        if (status == current) {
            return toResponse(order, invoiceService.getAvailableInvoiceUrl(order.getId()));
        }
        if (status == Status.CANCELLED && current == Status.DELIVERED) {
            throw new BadRequestException("A delivered order cannot be cancelled");
        }

        order.setStatus(status);
        whatsAppNotifier.notifyStatusChanged(order, current);
        return toResponse(order, invoiceService.getAvailableInvoiceUrl(order.getId()));
    }

    @Transactional
    public OrderResponseDTO recordPayment(String orderId, PaymentRequestDTO paymentDTO) {
        Orders order = ordersRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        if (paymentDTO.getAmount() == null || paymentDTO.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Payment amount must be greater than zero");
        }

        BigDecimal due = order.getBalanceDue();
        if (paymentDTO.getAmount().compareTo(due) > 0) {
            throw new BadRequestException("Payment amount exceeds the balance due");
        }

        Payment payment = new Payment();
        payment.setOrder(order);
        payment.setAmount(paymentDTO.getAmount().setScale(2, RoundingMode.HALF_UP));
        payment.setMethod(paymentDTO.getMethod() == null
                ? com.faeiq.ClothNCare.orders.entity.PaymentMethod.CASH : paymentDTO.getMethod());
        payment.setPaidAt(LocalDateTime.now());
        payment.setRecordedBy(getCurrentUser());
        paymentRepository.save(payment);

        BigDecimal paid = order.getPaid_amount() == null ? BigDecimal.ZERO : order.getPaid_amount();
        order.setPaid_amount(paid.add(payment.getAmount()).setScale(2, RoundingMode.HALF_UP));

        return toResponse(order, invoiceService.getAvailableInvoiceUrl(order.getId()));
    }

    @Transactional
    public void deleteOrder(String orderId) {
        Orders order = ordersRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        invoiceService.deleteInvoice(order.getId());
        ordersRepository.delete(order);
    }

    @Transactional
    public OrderResponseDTO deletePayment(String paymentId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found"));

        Orders order = payment.getOrder();
        if (order == null) {
            throw new BadRequestException("Payment has no linked order");
        }

        order.getPayments().remove(payment);
        paymentRepository.delete(payment);

        BigDecimal paid = order.getPayments() == null ? BigDecimal.ZERO : order.getPayments().stream()
                .map(Payment::getAmount)
                .filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
        order.setPaid_amount(paid);

        Orders saved = ordersRepository.save(order);
        invoiceService.generateInvoice(saved.getId());
        return toResponse(saved, invoiceService.getAvailableInvoiceUrl(saved.getId()));
    }

    @Transactional(readOnly = true)
    public List<OrderResponseDTO> getAllOrders() {
        return ordersRepository.findAll().stream()
                .map(order -> toResponse(order, invoiceService.getAvailableInvoiceUrl(order.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public OrderResponseDTO getOrderById(String id) {
        Orders order = ordersRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        return toResponse(order, invoiceService.getAvailableInvoiceUrl(order.getId()));
    }

    @Transactional(readOnly = true)
    public List<PaymentRecordDTO> getPayments(LocalDate from, LocalDate to) {
        LocalDateTime start = from == null
                ? LocalDate.now().minusDays(30).atStartOfDay() : from.atStartOfDay();
        LocalDateTime end = to == null
                ? LocalDateTime.now() : to.plusDays(1).atStartOfDay().minusNanos(1);
        return paymentRepository.findByPaidAtBetween(start, end).stream()
                .map(payment -> new PaymentRecordDTO(
                        payment.getId(),
                        payment.getAmount(),
                        payment.getMethod(),
                        payment.getPaidAt(),
                        payment.getRecordedBy() != null ? payment.getRecordedBy().getName() : null,
                        payment.getOrder() != null ? payment.getOrder().getId() : null,
                        payment.getOrder() != null ? payment.getOrder().getInvoice_number() : null,
                        payment.getOrder() != null && payment.getOrder().getCustomer() != null
                                ? payment.getOrder().getCustomer().getName() : null
                ))
                .toList();
    }

    private void validateOrder(OrderDTO orderDTO) {
        if (orderDTO.getCustomerId() == null && orderDTO.getEmail() == null && orderDTO.getPhone() == null) {
            throw new BadRequestException("Customer id, email, or phone is required");
        }
        if (orderDTO.getItems() == null || orderDTO.getItems().isEmpty()) {
            throw new BadRequestException("Order must contain at least one item");
        }
        for (OrderItemsDTO item : orderDTO.getItems()) {
            if (item.getServiceType() == null || item.getProductType() == null) {
                throw new BadRequestException("Service type and product type are required");
            }
            if (item.getQuantity() <= 0) {
                throw new BadRequestException("Item quantity must be greater than zero");
            }
            if (item.getUnitPrice() != null && item.getUnitPrice().compareTo(BigDecimal.ZERO) < 0) {
                throw new BadRequestException("Unit price cannot be negative");
            }
        }
    }

    private Customer findCustomer(OrderDTO orderDTO) {
        if (orderDTO.getCustomerId() != null) {
            return customerRepository.findById(orderDTO.getCustomerId()).orElse(null);
        }

        if (orderDTO.getEmail() != null) {
            return customerRepository.findByEmail(orderDTO.getEmail());
        }

        return customerRepository.findByPhone(orderDTO.getPhone());
    }

    private Users getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || authentication.getName() == null) {
            return null;
        }

        return usersRepository.findByEmail(authentication.getName());
    }

    private BigDecimal normalize(BigDecimal value) {
        if (value == null || value.compareTo(BigDecimal.ZERO) < 0) {
            return BigDecimal.ZERO;
        }
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private String paymentStatus(Orders order) {
        BigDecimal total = order.getTotal_price() == null ? BigDecimal.ZERO : order.getTotal_price();
        BigDecimal paid = order.getPaid_amount() == null ? BigDecimal.ZERO : order.getPaid_amount();
        if (paid.compareTo(total) >= 0 && total.compareTo(BigDecimal.ZERO) > 0) {
            return "PAID";
        }
        if (paid.compareTo(BigDecimal.ZERO) > 0) {
            return "PARTIAL";
        }
        return "UNPAID";
    }

    private OrderResponseDTO toResponse(Orders order, String invoiceUrl) {
        List<OrderItemResponseDTO> items = order.getItems().stream()
                .map(item -> new OrderItemResponseDTO(
                        item.getId(),
                        item.getService_type(),
                        item.getProduct_type(),
                        item.getQuantity(),
                        item.getPrice(),
                        item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity())).setScale(2, RoundingMode.HALF_UP)
                ))
                .toList();

        List<PaymentResponseDTO> payments = (order.getPayments() == null ? List.<Payment>of() : order.getPayments()).stream()
                .map(p -> new PaymentResponseDTO(
                        p.getId(),
                        p.getAmount(),
                        p.getMethod(),
                        p.getPaidAt(),
                        p.getRecordedBy() != null ? p.getRecordedBy().getName() : null
                ))
                .toList();

        return new OrderResponseDTO(
                order.getId(),
                order.getStatus(),
                order.getTotal_price(),
                order.getDiscount(),
                order.getTax_amount(),
                order.getPaid_amount(),
                order.getBalanceDue(),
                paymentStatus(order),
                order.getInvoice_number(),
                order.getExpected_delivery_date(),
                order.getCreated_at(),
                invoiceUrl,
                order.getCustomer() != null ? order.getCustomer().getName() : null,
                order.getCustomer() != null ? order.getCustomer().getPhone() : null,
                order.getCustomer() != null ? order.getCustomer().getEmail() : null,
                order.getCreatedBy() != null ? order.getCreatedBy().getName() : null,
                items,
                payments
        );
    }
}
