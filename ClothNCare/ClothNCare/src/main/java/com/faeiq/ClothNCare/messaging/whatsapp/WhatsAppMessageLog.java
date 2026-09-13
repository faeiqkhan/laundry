package com.faeiq.ClothNCare.messaging.whatsapp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Data
public class WhatsAppMessageLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String toPhone;

    private String category;

    private String status;

    @Column(length = 2000)
    private String body;

    private String templateName;

    /** Correlation key used for deduplication, e.g. "CUSTOMER:123" or "ORDER:456:READY". */
    @Column(length = 200)
    private String businessKey;

    private String messageType;

    private String customerId;

    private String orderId;

    private String invoiceId;

    private String provider;

    private String providerMessageId;

    @Column(length = 500)
    private String failureReason;

    private Integer attemptCount = 0;

    private LocalDateTime lastAttemptAt;

    private LocalDateTime nextRetryAt;

    private LocalDateTime sentAt = LocalDateTime.now();
}