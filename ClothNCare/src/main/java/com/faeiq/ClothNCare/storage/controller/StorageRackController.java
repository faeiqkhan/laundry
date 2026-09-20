package com.faeiq.ClothNCare.storage.controller;

import com.faeiq.ClothNCare.common.ApiResponse;
import com.faeiq.ClothNCare.common.ApiResponseUtil;
import com.faeiq.ClothNCare.storage.dto.StorageRackDTO;
import com.faeiq.ClothNCare.storage.dto.StorageRackResponseDTO;
import com.faeiq.ClothNCare.storage.service.StorageRackService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/racks")
@RequiredArgsConstructor
public class StorageRackController {

    private final StorageRackService storageRackService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<StorageRackResponseDTO>>> getAllRacks() {
        return ResponseEntity.ok(ApiResponseUtil.success(storageRackService.getAllRacks(), "Racks fetched"));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<StorageRackResponseDTO>> createRack(@RequestBody StorageRackDTO dto) {
        return ResponseEntity.ok(ApiResponseUtil.success(storageRackService.createRack(dto), "Rack added"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<StorageRackResponseDTO>> updateRack(@PathVariable String id, @RequestBody StorageRackDTO dto) {
        return ResponseEntity.ok(ApiResponseUtil.success(storageRackService.updateRack(id, dto), "Rack updated"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<Void>> deleteRack(@PathVariable String id) {
        storageRackService.deleteRack(id);
        return ResponseEntity.ok(ApiResponseUtil.success(null, "Rack deleted"));
    }
}
