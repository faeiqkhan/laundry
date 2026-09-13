package com.faeiq.ClothNCare.messaging.whatsapp;

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

    @jakarta.persistence.Column(length = 2000)
    private String body;

    private String templateName;

    private LocalDateTime sentAt = LocalDateTime.now();
}