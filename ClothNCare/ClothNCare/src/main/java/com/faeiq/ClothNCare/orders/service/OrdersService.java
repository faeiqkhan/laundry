package com.faeiq.ClothNCare.orders.service;

import com.faeiq.ClothNCare.LaundryService.service.LaundryServiceService;
import com.faeiq.ClothNCare.billing.service.InvoiceService;
import com.faeiq.ClothNCare.common.exception.BadRequestException;
import com.faeiq.ClothNCare.common.exception.ResourceNotFoundException;
import com.faeiq.ClothNCare.customer.entity.Customer;
import com.faeiq.ClothNCare.customer.repository.CustomerRepository;
import com.faeiq.ClothNCare.orders.dto.OrderDTO;
import com.faeiq.ClothNCare.orders.dto.OrderItemResponseDTO;
import com.faeiq.ClothNCare.orders.dto.OrderItemsDTO;
import com.faeiq.ClothNCare.orders.dto.OrderResponseDTO;
import com.faeiq.ClothNCare.orders.entity.Orders;
import com.faeiq.ClothNCare.orders.entity.OrdersItems;
import com.faeiq.ClothNCare.orders.entity.Status;
import com.faeiq.ClothNCare.orders.repository.OrdersRepository;
import com.faeiq.ClothNCare.user.entity.Users;
import com.faeiq.ClothNCare.user.repository.UsersRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class OrdersService {

    private final CustomerRepository customerRepository;
    private final OrdersRepository ordersRepository;
    private final UsersRepository usersRepository;
    private final LaundryServiceService laundryServiceService;
    private final InvoiceService invoiceService;

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
        order.setExpected_delivery_date(orderDTO.getExpectedDeliveryDate());
        order.setCreated_at(LocalDateTime.now());

        List<OrdersItems> items = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;

        for (OrderItemsDTO itemDTO : orderDTO.getItems()) {
            BigDecimal unitPrice = laundryServiceService.getPrice(itemDTO.getServiceType(), itemDTO.getProductType());

            OrdersItems item = new OrdersItems();
            item.setOrders(order);
            item.setService_type(itemDTO.getServiceType());
            item.setProduct_type(itemDTO.getProductType());
            item.setQuantity(itemDTO.getQuantity());
            item.setPrice(unitPrice);

            total = total.add(unitPrice.multiply(BigDecimal.valueOf(itemDTO.getQuantity())));
            items.add(item);
        }

        order.setTotal_price(total);
        order.setItems(items);

        Orders savedOrder = ordersRepository.save(order);
        String invoiceUrl = invoiceService.generateInvoice(savedOrder.getId()).getInvoiceUrl();

        return toResponse(savedOrder, invoiceUrl);
    }

    @Transactional
    public OrderResponseDTO updateStatus(String orderId, Status status) {
        Orders order = ordersRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        order.setStatus(status);
        return toResponse(order, invoiceService.getInvoiceUrl(order.getId()));
    }

    @Transactional(readOnly = true)
    public List<OrderResponseDTO> getAllOrders() {
        return ordersRepository.findAll().stream()
                .map(order -> toResponse(order, invoiceService.getInvoiceUrl(order.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public OrderResponseDTO getOrderById(String id) {
        Orders order = ordersRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        return toResponse(order, invoiceService.getInvoiceUrl(order.getId()));
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

    private OrderResponseDTO toResponse(Orders order, String invoiceUrl) {
        List<OrderItemResponseDTO> items = order.getItems().stream()
                .map(item -> new OrderItemResponseDTO(
                        item.getId(),
                        item.getService_type(),
                        item.getProduct_type(),
                        item.getQuantity(),
                        item.getPrice(),
                        item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity()))
                ))
                .toList();

        return new OrderResponseDTO(
                order.getId(),
                order.getStatus(),
                order.getTotal_price(),
                order.getExpected_delivery_date(),
                invoiceUrl,
                order.getCustomer() != null ? order.getCustomer().getName() : null,
                order.getCustomer() != null ? order.getCustomer().getPhone() : null,
                order.getCreatedBy() != null ? order.getCreatedBy().getName() : null,
                items
        );
    }
}
