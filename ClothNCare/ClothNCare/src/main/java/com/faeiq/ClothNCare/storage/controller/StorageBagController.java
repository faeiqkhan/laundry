package com.faeiq.ClothNCare.storage.controller;

import com.faeiq.ClothNCare.common.ApiResponse;
import com.faeiq.ClothNCare.common.ApiResponseUtil;
import com.faeiq.ClothNCare.storage.dto.StorageBagDTO;
import com.faeiq.ClothNCare.storage.dto.StorageBagResponseDTO;
import com.faeiq.ClothNCare.storage.service.StorageBagService;
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
@RequestMapping("/api/bags")
@RequiredArgsConstructor
public class StorageBagController {

    private final StorageBagService storageBagService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<StorageBagResponseDTO>>> getAllBags() {
        return ResponseEntity.ok(ApiResponseUtil.success(storageBagService.getAllBags(), "Bags fetched"));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<StorageBagResponseDTO>> createBag(@RequestBody StorageBagDTO dto) {
        return ResponseEntity.ok(ApiResponseUtil.success(storageBagService.createBag(dto), "Bag added"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<StorageBagResponseDTO>> updateBag(@PathVariable String id, @RequestBody StorageBagDTO dto) {
        return ResponseEntity.ok(ApiResponseUtil.success(storageBagService.updateBag(id, dto), "Bag updated"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<Void>> deleteBag(@PathVariable String id) {
        storageBagService.deleteBag(id);
        return ResponseEntity.ok(ApiResponseUtil.success(null, "Bag deleted"));
    }
}
