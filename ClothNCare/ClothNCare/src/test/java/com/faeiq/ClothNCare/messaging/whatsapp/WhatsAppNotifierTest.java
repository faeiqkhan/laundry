package com.faeiq.ClothNCare.messaging.whatsapp;

import com.faeiq.ClothNCare.customer.entity.Customer;
import com.faeiq.ClothNCare.orders.entity.Orders;
import com.faeiq.ClothNCare.orders.entity.Status;
import com.faeiq.ClothNCare.settings.entity.AppSettings;
import com.faeiq.ClothNCare.settings.service.SettingsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WhatsAppNotifierTest {

    private WhatsAppMessagingService messagingService;
    private SettingsService settingsService;
    private WhatsAppNotifier notifier;

    private AppSettings settings;

    @BeforeEach
    void setUp() {
        messagingService = mock(WhatsAppMessagingService.class);
        settingsService = mock(SettingsService.class);
        settings = new AppSettings();
        settings.setBusinessName("Test Laundry");
        when(settingsService.getSettings()).thenReturn(settings);
        notifier = new WhatsAppNotifier(messagingService, settingsService);
    }

    @Test
    void welcomeIsNotSentWhenAutoWelcomeDisabled() {
        settings.setWhatsAppAutoWelcome(false);

        Customer customer = new Customer();
        customer.setId("c1");
        customer.setName("Alice");
        customer.setPhone("9876543210");

        notifier.notifyCustomerCreated(customer);

        verify(messagingService, never()).submit(any());
    }

    @Test
    void welcomeIsQueuedWithDedupeKeyWhenEnabled() {
        settings.setWhatsAppAutoWelcome(true);

        Customer customer = new Customer();
        customer.setId("c1");
        customer.setName("Alice");
        customer.setPhone("9876543210");

        notifier.notifyCustomerCreated(customer);

        org.mockito.ArgumentCaptor<WhatsAppMessageRequest> captor =
                org.mockito.ArgumentCaptor.forClass(WhatsAppMessageRequest.class);
        verify(messagingService).submit(captor.capture());
        WhatsAppMessageRequest request = captor.getValue();
        assertEquals("CUSTOMER:c1", request.getBusinessKey());
        assertEquals(WhatsAppMessageStatus.CAT_WELCOME, request.getCategory());
        assertEquals("CUSTOMER_CREATED", request.getMessageType());
        assertTrue(request.getBody().contains("Test Laundry"));
    }

    @Test
    void statusNotificationRequiresAutoStatus() {
        settings.setWhatsAppAutoStatus(false);

        Customer customer = new Customer();
        customer.setId("c1");
        customer.setPhone("9876543210");
        Orders order = new Orders();
        order.setId("o1");
        order.setCustomer(customer);
        order.setInvoice_number("INV-2026-000001");
        order.setStatus(Status.READY);

        notifier.notifyStatusChanged(order, Status.WASHING);

        verify(messagingService, never()).submit(any());
    }

    @Test
    void statusNotificationQueuesWithOrderAndStatusKey() {
        settings.setWhatsAppAutoStatus(true);

        Customer customer = new Customer();
        customer.setId("c1");
        customer.setName("Bob");
        customer.setPhone("9876543210");
        Orders order = new Orders();
        order.setId("o1");
        order.setCustomer(customer);
        order.setInvoice_number("INV-2026-000001");
        order.setStatus(Status.READY);

        notifier.notifyStatusChanged(order, Status.WASHING);

        org.mockito.ArgumentCaptor<WhatsAppMessageRequest> captor =
                org.mockito.ArgumentCaptor.forClass(WhatsAppMessageRequest.class);
        verify(messagingService).submit(captor.capture());
        WhatsAppMessageRequest request = captor.getValue();
        assertEquals("ORDER:o1:READY", request.getBusinessKey());
        assertEquals(WhatsAppMessageStatus.CAT_STATUS, request.getCategory());
        assertEquals("STATUS_CHANGED", request.getMessageType());
        assertTrue(request.getBody().contains("ready for delivery"));
    }

    @Test
    void orderNotificationIsQueuedWithInvoiceBodyWhenEnabled() {
        settings.setWhatsAppAutoInvoice(true);

        Customer customer = new Customer();
        customer.setId("c1");
        customer.setName("Carol");
        customer.setPhone("9876543210");
        Orders order = new Orders();
        order.setId("o1");
        order.setCustomer(customer);
        order.setInvoice_number("INV-2026-000001");
        order.setStatus(Status.RECEIVED);

        notifier.notifyOrderCreated(order);

        org.mockito.ArgumentCaptor<WhatsAppMessageRequest> captor =
                org.mockito.ArgumentCaptor.forClass(WhatsAppMessageRequest.class);
        verify(messagingService).submit(captor.capture());
        WhatsAppMessageRequest request = captor.getValue();
        assertEquals("ORDER:o1:INVOICE", request.getBusinessKey());
        assertEquals(WhatsAppMessageStatus.CAT_INVOICE, request.getCategory());
        assertEquals("ORDER_CREATED", request.getMessageType());
    }

    @Test
    void customerWithoutPhoneIsIgnored() {
        settings.setWhatsAppAutoWelcome(true);

        Customer customer = new Customer();
        customer.setId("c1");
        customer.setPhone("");

        notifier.notifyCustomerCreated(customer);

        verify(messagingService, never()).submit(any());
    }
}