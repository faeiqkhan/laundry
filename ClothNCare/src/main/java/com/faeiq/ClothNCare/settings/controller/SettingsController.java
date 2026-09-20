package com.faeiq.ClothNCare.settings.controller;

import com.faeiq.ClothNCare.common.ApiResponse;
import com.faeiq.ClothNCare.common.ApiResponseUtil;
import com.faeiq.ClothNCare.settings.dto.SettingsDTO;
import com.faeiq.ClothNCare.settings.entity.AppSettings;
import com.faeiq.ClothNCare.settings.service.SettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;
import java.nio.file.Files;
import java.nio.file.Path;

@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor
public class SettingsController {

    private final SettingsService settingsService;

    @GetMapping
    public ResponseEntity<ApiResponse<AppSettings>> getSettings() {
        return ResponseEntity.ok(ApiResponseUtil.success(settingsService.getSettings(), "Settings fetched"));
    }

    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<AppSettings>> updateSettings(@RequestBody SettingsDTO dto) {
        return ResponseEntity.ok(ApiResponseUtil.success(settingsService.updateSettings(dto), "Settings updated"));
    }

    @PostMapping("/store-signature")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<AppSettings>> uploadStoreSignature(@RequestParam("file") MultipartFile file) throws java.io.IOException {
        if (file.isEmpty() || file.getContentType() == null || !file.getContentType().startsWith("image/")) {
            return ResponseEntity.badRequest().body(ApiResponseUtil.error("Upload a signature image"));
        }
        Path directory = Path.of("uploads");
        Files.createDirectories(directory);
        String extension = file.getOriginalFilename() != null && file.getOriginalFilename().contains(".")
                ? file.getOriginalFilename().substring(file.getOriginalFilename().lastIndexOf('.')) : ".png";
        Path target = directory.resolve("store-signature" + extension);
        file.transferTo(target);
        AppSettings settings = settingsService.getSettings();
        settings.setStoreSignaturePath(target.toString());
        return ResponseEntity.ok(ApiResponseUtil.success(settingsService.save(settings), "Store signature uploaded"));
    }
}
