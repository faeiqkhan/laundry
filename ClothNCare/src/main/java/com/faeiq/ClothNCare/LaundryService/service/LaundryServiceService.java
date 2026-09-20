package com.faeiq.ClothNCare.LaundryService.service;

import com.faeiq.ClothNCare.LaundryService.dto.LaundryServiceDTO;
import com.faeiq.ClothNCare.LaundryService.dto.LaundryServiceResponseDTO;
import com.faeiq.ClothNCare.LaundryService.entity.LaundryService;
import com.faeiq.ClothNCare.LaundryService.repository.LaundryServiceRepository;
import com.faeiq.ClothNCare.common.exception.BadRequestException;
import com.faeiq.ClothNCare.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@RequiredArgsConstructor
@Service
public class LaundryServiceService {

    private final LaundryServiceRepository laundryServiceRepository;

    @Transactional
    public LaundryServiceResponseDTO createService(LaundryServiceDTO serviceDTO) {
        LaundryService service = new LaundryService();
        service.setName(serviceDTO.getName());
        service.setProductType(serviceDTO.getProductType());
        service.setPrice(serviceDTO.getPrice());
        service.setActive(serviceDTO.isActive());

        return toResponse(laundryServiceRepository.save(service));
    }

    @Transactional(readOnly = true)
    public List<LaundryServiceResponseDTO> getAllServices() {
        return laundryServiceRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public LaundryServiceResponseDTO updateService(String id, LaundryServiceDTO serviceDTO) {
        LaundryService service = laundryServiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Laundry service not found"));

        service.setName(serviceDTO.getName());
        service.setProductType(serviceDTO.getProductType());
        service.setPrice(serviceDTO.getPrice());
        service.setActive(serviceDTO.isActive());

        return toResponse(service);
    }

    @Transactional
    public void deleteService(String id) {
        if (!laundryServiceRepository.existsById(id)) {
            throw new ResourceNotFoundException("Laundry service not found");
        }

        laundryServiceRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public BigDecimal getPrice(String name, String productType) {
        LaundryService service = laundryServiceRepository
                .findByNameAndProductType(name, productType)
                .orElseThrow(() -> new ResourceNotFoundException("Laundry service not found"));

        if (!service.isActive()) {
            throw new BadRequestException("Laundry service is inactive");
        }

        return service.getPrice();
    }

    private LaundryServiceResponseDTO toResponse(LaundryService service) {
        return new LaundryServiceResponseDTO(
                service.getId(),
                service.getName(),
                service.getProductType(),
                service.getPrice(),
                service.isActive()
        );
    }
}
