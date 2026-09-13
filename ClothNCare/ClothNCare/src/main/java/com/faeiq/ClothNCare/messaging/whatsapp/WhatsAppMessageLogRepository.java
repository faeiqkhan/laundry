package com.faeiq.ClothNCare.messaging.whatsapp;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WhatsAppMessageLogRepository extends JpaRepository<WhatsAppMessageLog, String> {

    List<WhatsAppMessageLog> findAllByOrderBySentAtDesc();

    List<WhatsAppMessageLog> findAllByToPhoneContainingIgnoreCaseOrderBySentAtDesc(String toPhone);
}