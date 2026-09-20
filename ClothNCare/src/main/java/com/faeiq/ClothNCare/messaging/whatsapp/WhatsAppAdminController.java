package com.faeiq.ClothNCare.messaging.whatsapp;

import com.faeiq.ClothNCare.billing.service.InvoiceService;
import com.faeiq.ClothNCare.common.ApiResponse;
import com.faeiq.ClothNCare.common.ApiResponseUtil;
import com.faeiq.ClothNCare.common.exception.ResourceNotFoundException;
import com.faeiq.ClothNCare.orders.entity.Orders;
import com.faeiq.ClothNCare.orders.repository.OrdersRepository;
import com.faeiq.ClothNCare.settings.entity.AppSettings;
import com.faeiq.ClothNCare.settings.service.SettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.File;

/**
 * Admin/setup endpoints for the WhatsApp connection, manual sends and
 * invoice delivery.
 */
@RestController
@RequestMapping("/api/whatsapp")
@RequiredArgsConstructor
public class WhatsAppAdminController {

    private final WhatsAppMessagingService messagingService;
    private final SettingsService settingsService;
    private final OrdersRepository ordersRepository;
    private final InvoiceService invoiceService;

    @GetMapping("/connection/status")
    public ResponseEntity<ApiResponse<WhatsAppConnectionStatus>> status() {
        return ResponseEntity.ok(ApiResponseUtil.success(messagingService.connectionStatus(),
                "WhatsApp connection status"));
    }

    @PostMapping("/connection/connect")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<WhatsAppConnectionStatus>> connect() {
        messagingService.connect();
        return ResponseEntity.ok(ApiResponseUtil.success(messagingService.connectionStatus(),
                "WhatsApp client started"));
    }

    @PostMapping("/connection/reconnect")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<WhatsAppConnectionStatus>> reconnect() {
        messagingService.reconnect();
        return ResponseEntity.ok(ApiResponseUtil.success(messagingService.connectionStatus(),
                "WhatsApp client reconnecting"));
    }

    @PostMapping("/connection/logout")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<WhatsAppConnectionStatus>> logout() {
        messagingService.logout();
        return ResponseEntity.ok(ApiResponseUtil.success(messagingService.connectionStatus(),
                "WhatsApp logged out"));
    }

    @PostMapping("/send")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<WhatsAppDeliveryResult>> sendMessage(
            @RequestBody WhatsAppSendRequestDTO request) {
        WhatsAppMessageRequest message = new WhatsAppMessageRequest(
                WhatsAppMessageStatus.CAT_MANUAL, request.getTo(), request.getBody());
        WhatsAppDeliveryResult result = messagingService.sendManual(message);
        return ResponseEntity.ok(ApiResponseUtil.success(result, result.getMessage()));
    }

    @PostMapping("/invoice/{orderId}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<WhatsAppDeliveryResult>> sendInvoice(@PathVariable String orderId) {
        Orders order = ordersRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        String invoiceFile = "invoices" + File.separator + "INV-" + orderId + ".pdf";
        if (!new File(invoiceFile).exists()) {
            invoiceService.generateInvoice(orderId);
        }

        String customerPhone = order.getCustomer() != null ? order.getCustomer().getPhone() : null;
        String customerId = order.getCustomer() != null ? order.getCustomer().getId() : null;

        WhatsAppDocumentRequest request = new WhatsAppDocumentRequest();
        request.setCategory(WhatsAppMessageStatus.CAT_DOCUMENT);
        request.setMessageType("INVOICE");
        request.setTo(customerPhone);
        request.setFilePath(new File(invoiceFile).getAbsolutePath());
        request.setFilename("INV-" + (order.getInvoice_number() == null ? orderId : order.getInvoice_number()) + ".pdf");
        request.setBody("Invoice " + (order.getInvoice_number() == null ? "" : order.getInvoice_number())
                + " for your order from " + businessName() + ".");
        request.setOrderId(order.getId());
        request.setCustomerId(customerId);
        request.setInvoiceId(order.getInvoice_number());

        AppSettings settings = settingsService.getSettings();
        WhatsAppDeliveryResult result = messagingService.sendInvoiceDocument(request, settings);
        return ResponseEntity.ok(ApiResponseUtil.success(result, result.getMessage()));
    }

    @PostMapping("/messages/{id}/retry")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<WhatsAppMessageLog>> retry(@PathVariable String id) {
        WhatsAppMessageLog entry = messagingService.retryMessage(id);
        if (entry == null) {
            throw new ResourceNotFoundException("Message log not found");
        }
        return ResponseEntity.ok(ApiResponseUtil.success(entry, "Message queued for retry"));
    }

    private String businessName() {
        AppSettings settings = settingsService.getSettings();
        return settings.getBusinessName() == null || settings.getBusinessName().isBlank()
                ? "Cloth n Care" : settings.getBusinessName();
    }
}