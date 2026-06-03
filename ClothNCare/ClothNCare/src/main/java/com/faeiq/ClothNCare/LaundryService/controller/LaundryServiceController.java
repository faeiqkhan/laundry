package com.faeiq.ClothNCare.LaundryService.controller;

import com.faeiq.ClothNCare.LaundryService.dto.LaundryServiceDTO;
import com.faeiq.ClothNCare.LaundryService.dto.LaundryServiceResponseDTO;
import com.faeiq.ClothNCare.LaundryService.service.LaundryServiceService;
import com.faeiq.ClothNCare.common.ApiResponse;
import com.faeiq.ClothNCare.common.ApiResponseUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
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
@RequestMapping("/services")
@RequiredArgsConstructor
public class LaundryServiceController {

    private final LaundryServiceService laundryServiceService;

    @PostMapping
    public ResponseEntity<ApiResponse<LaundryServiceResponseDTO>> create(@RequestBody LaundryServiceDTO serviceDTO) {
        LaundryServiceResponseDTO service = laundryServiceService.createService(serviceDTO);
        return ResponseEntity.ok(ApiResponseUtil.success(service, "Laundry service created successfully"));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<LaundryServiceResponseDTO>>> getAll() {
        List<LaundryServiceResponseDTO> services = laundryServiceService.getAllServices();
        return ResponseEntity.ok(ApiResponseUtil.success(services, "Laundry services fetched successfully"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<LaundryServiceResponseDTO>> update(
            @PathVariable String id,
            @RequestBody LaundryServiceDTO serviceDTO) {

        LaundryServiceResponseDTO service = laundryServiceService.updateService(id, serviceDTO);
        return ResponseEntity.ok(ApiResponseUtil.success(service, "Laundry service updated successfully"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable String id) {
        laundryServiceService.deleteService(id);
        return ResponseEntity.ok(ApiResponseUtil.success(null, "Laundry service deleted successfully"));
    }
}
