package com.faeiq.ClothNCare.messaging.whatsapp;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WhatsAppMessageLogRepository extends JpaRepository<WhatsAppMessageLog, String> {

    List<WhatsAppMessageLog> findAllByOrderBySentAtDesc();

    List<WhatsAppMessageLog> findAllByToPhoneContainingIgnoreCaseOrderBySentAtDesc(String toPhone);

    Optional<WhatsAppMessageLog> findFirstByBusinessKeyOrderBySentAtDesc(String businessKey);

    boolean existsByBusinessKeyAndStatusIn(String businessKey, List<String> statuses);

    List<WhatsAppMessageLog> findByStatusInOrderByNextRetryAtAsc(List<String> statuses);
}