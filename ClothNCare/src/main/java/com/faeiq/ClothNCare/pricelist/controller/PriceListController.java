package com.faeiq.ClothNCare.pricelist.controller;

import com.faeiq.ClothNCare.common.ApiResponse;
import com.faeiq.ClothNCare.common.ApiResponseUtil;
import com.faeiq.ClothNCare.pricelist.dto.PriceListDTO;
import com.faeiq.ClothNCare.pricelist.dto.PriceListResponseDTO;
import com.faeiq.ClothNCare.pricelist.service.PriceListService;
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
@RequestMapping("/api/price-lists")
@RequiredArgsConstructor
public class PriceListController {

    private final PriceListService priceListService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<PriceListResponseDTO>>> getAllPriceLists() {
        return ResponseEntity.ok(ApiResponseUtil.success(priceListService.getAllPriceLists(), "Price lists fetched"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PriceListResponseDTO>> getPriceListById(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponseUtil.success(priceListService.getPriceListById(id), "Price list fetched"));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<PriceListResponseDTO>> createPriceList(@RequestBody PriceListDTO dto) {
        return ResponseEntity.ok(ApiResponseUtil.success(priceListService.createPriceList(dto), "Price list created"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<PriceListResponseDTO>> updatePriceList(@PathVariable String id, @RequestBody PriceListDTO dto) {
        return ResponseEntity.ok(ApiResponseUtil.success(priceListService.updatePriceList(id, dto), "Price list updated"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<Void>> deletePriceList(@PathVariable String id) {
        priceListService.deletePriceList(id);
        return ResponseEntity.ok(ApiResponseUtil.success(null, "Price list deleted"));
    }

    @PostMapping("/{id}/activate")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<PriceListResponseDTO>> activatePriceList(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponseUtil.success(priceListService.activatePriceList(id), "Price list activated"));
    }
}
