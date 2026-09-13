package com.faeiq.ClothNCare.messaging.whatsapp;

import com.faeiq.ClothNCare.common.ApiResponse;
import com.faeiq.ClothNCare.common.ApiResponseUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/whatsapp/messages")
@RequiredArgsConstructor
public class WhatsAppMessageController {

    private final WhatsAppService whatsAppService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<WhatsAppMessageLog>>> getMessageHistory(
            @RequestParam(required = false) String phone) {
        List<WhatsAppMessageLog> messages = whatsAppService.getMessageHistory(phone);
        return ResponseEntity.ok(ApiResponseUtil.success(messages, "Message history fetched"));
    }
}