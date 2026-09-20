package com.faeiq.ClothNCare.charge.controller;

import com.faeiq.ClothNCare.charge.dto.ChargeTypeDTO;
import com.faeiq.ClothNCare.charge.dto.ChargeTypeResponseDTO;
import com.faeiq.ClothNCare.charge.service.ChargeTypeService;
import com.faeiq.ClothNCare.common.ApiResponse;
import com.faeiq.ClothNCare.common.ApiResponseUtil;
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
@RequestMapping("/api/charge-types")
@RequiredArgsConstructor
public class ChargeTypeController {

    private final ChargeTypeService chargeTypeService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ChargeTypeResponseDTO>>> getAllChargeTypes() {
        return ResponseEntity.ok(ApiResponseUtil.success(chargeTypeService.getAllChargeTypes(), "Charge types fetched"));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<ChargeTypeResponseDTO>> createChargeType(@RequestBody ChargeTypeDTO dto) {
        return ResponseEntity.ok(ApiResponseUtil.success(chargeTypeService.createChargeType(dto), "Charge type added"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<ChargeTypeResponseDTO>> updateChargeType(@PathVariable String id, @RequestBody ChargeTypeDTO dto) {
        return ResponseEntity.ok(ApiResponseUtil.success(chargeTypeService.updateChargeType(id, dto), "Charge type updated"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<Void>> deleteChargeType(@PathVariable String id) {
        chargeTypeService.deleteChargeType(id);
        return ResponseEntity.ok(ApiResponseUtil.success(null, "Charge type deleted"));
    }
}
