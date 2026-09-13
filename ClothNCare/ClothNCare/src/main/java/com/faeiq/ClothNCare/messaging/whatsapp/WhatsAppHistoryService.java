package com.faeiq.ClothNCare.messaging.whatsapp;

import com.faeiq.ClothNCare.customer.entity.Customer;
import com.faeiq.ClothNCare.customer.repository.CustomerRepository;
import com.faeiq.ClothNCare.orders.entity.Orders;
import com.faeiq.ClothNCare.orders.repository.OrdersRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * Read queries for the WhatsApp message history screen.
 */
@Service
public class WhatsAppHistoryService {

    private static final DateTimeFormatter DATE_TIME_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final WhatsAppMessageLogRepository logRepository;
    private final CustomerRepository customerRepository;
    private final OrdersRepository ordersRepository;

    public WhatsAppHistoryService(WhatsAppMessageLogRepository logRepository,
                                  CustomerRepository customerRepository,
                                  OrdersRepository ordersRepository) {
        this.logRepository = logRepository;
        this.customerRepository = customerRepository;
        this.ordersRepository = ordersRepository;
    }

    @Transactional(readOnly = true)
    public List<WhatsAppMessageRecordDTO> getHistory(String phone, String status, String messageType,
                                                     LocalDate from, LocalDate to, Integer limit) {
        LocalDateTime start = from == null ? null : from.atStartOfDay();
        LocalDateTime end = to == null ? null : to.plusDays(1).atStartOfDay().minusNanos(1);

        List<WhatsAppMessageLog> all;
        if (phone != null && !phone.isBlank()) {
            all = logRepository.findAllByToPhoneContainingIgnoreCaseOrderBySentAtDesc(phone);
        } else {
            all = logRepository.findAllByOrderBySentAtDesc();
        }

        List<WhatsAppMessageRecordDTO> result = new ArrayList<>();
        for (WhatsAppMessageLog entry : all) {
            if (status != null && !status.isBlank() && !status.equalsIgnoreCase(entry.getStatus())) {
                continue;
            }
            if (messageType != null && !messageType.isBlank()
                    && !messageType.equalsIgnoreCase(entry.getMessageType())) {
                continue;
            }
            if (start != null && entry.getSentAt() != null && entry.getSentAt().isBefore(start)) {
                continue;
            }
            if (end != null && entry.getSentAt() != null && entry.getSentAt().isAfter(end)) {
                continue;
            }
            result.add(toDto(entry));
            if (limit != null && limit > 0 && result.size() >= limit) {
                break;
            }
        }
        return result;
    }

    private WhatsAppMessageRecordDTO toDto(WhatsAppMessageLog entry) {
        WhatsAppMessageRecordDTO dto = new WhatsAppMessageRecordDTO();
        dto.setId(entry.getId());
        dto.setToPhone(entry.getToPhone());
        dto.setCategory(entry.getCategory());
        dto.setStatus(entry.getStatus());
        dto.setBody(entry.getBody());
        dto.setTemplateName(entry.getTemplateName());
        dto.setBusinessKey(entry.getBusinessKey());
        dto.setMessageType(entry.getMessageType());
        dto.setCustomerId(entry.getCustomerId());
        dto.setOrderId(entry.getOrderId());
        dto.setInvoiceId(entry.getInvoiceId());
        dto.setProvider(entry.getProvider());
        dto.setProviderMessageId(entry.getProviderMessageId());
        dto.setFailureReason(entry.getFailureReason());
        dto.setAttemptCount(entry.getAttemptCount());
        dto.setLastAttemptAt(fmt(entry.getLastAttemptAt()));
        dto.setNextRetryAt(fmt(entry.getNextRetryAt()));
        dto.setSentAt(fmt(entry.getSentAt()));
        if (entry.getCustomerId() != null) {
            Customer customer = customerRepository.findById(entry.getCustomerId()).orElse(null);
            dto.setCustomerName(customer != null ? customer.getName() : null);
        }
        if (entry.getOrderId() != null) {
            Orders order = ordersRepository.findById(entry.getOrderId()).orElse(null);
            if (order != null && order.getInvoice_number() != null) {
                dto.setInvoiceId(order.getInvoice_number());
            }
        }
        return dto;
    }

    private String fmt(LocalDateTime value) {
        return value == null ? null : value.format(DATE_TIME_FMT);
    }
}