package com.faeiq.ClothNCare.messaging.whatsapp;

import com.faeiq.ClothNCare.common.ApiResponse;
import com.faeiq.ClothNCare.common.ApiResponseUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/whatsapp/messages")
@RequiredArgsConstructor
public class WhatsAppMessageController {

    private final WhatsAppHistoryService historyService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<WhatsAppMessageRecordDTO>>> getMessageHistory(
            @RequestParam(required = false) String phone,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String messageType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Integer limit) {
        List<WhatsAppMessageRecordDTO> messages =
                historyService.getHistory(phone, status, messageType, from, to, limit);
        return ResponseEntity.ok(ApiResponseUtil.success(messages, "Message history fetched"));
    }
}