package com.faeiq.ClothNCare.storage.service;

import com.faeiq.ClothNCare.common.exception.BadRequestException;
import com.faeiq.ClothNCare.common.exception.ResourceNotFoundException;
import com.faeiq.ClothNCare.storage.dto.StorageRackDTO;
import com.faeiq.ClothNCare.storage.dto.StorageRackResponseDTO;
import com.faeiq.ClothNCare.storage.entity.StorageRack;
import com.faeiq.ClothNCare.storage.repository.StorageRackRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class StorageRackService {

    private final StorageRackRepository storageRackRepository;

    @Transactional(readOnly = true)
    public List<StorageRackResponseDTO> getAllRacks() {
        return storageRackRepository.findAllByOrderByNameAsc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public StorageRackResponseDTO createRack(StorageRackDTO dto) {
        if (dto.getName() == null || dto.getName().isBlank()) {
            throw new BadRequestException("Rack name is required");
        }
        StorageRack rack = new StorageRack();
        rack.setName(dto.getName().trim());
        rack.setLocation(dto.getLocation());
        rack.setCapacity(dto.getCapacity() == null ? 0 : dto.getCapacity());
        rack.setNotes(dto.getNotes());
        return toResponse(storageRackRepository.save(rack));
    }

    @Transactional
    public StorageRackResponseDTO updateRack(String id, StorageRackDTO dto) {
        StorageRack rack = storageRackRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Storage rack not found"));
        if (dto.getName() == null || dto.getName().isBlank()) {
            throw new BadRequestException("Rack name is required");
        }
        rack.setName(dto.getName().trim());
        rack.setLocation(dto.getLocation());
        rack.setCapacity(dto.getCapacity() == null ? rack.getCapacity() : dto.getCapacity());
        rack.setNotes(dto.getNotes());
        return toResponse(storageRackRepository.save(rack));
    }

    @Transactional
    public void deleteRack(String id) {
        if (!storageRackRepository.existsById(id)) {
            throw new ResourceNotFoundException("Storage rack not found");
        }
        storageRackRepository.deleteById(id);
    }

    private StorageRackResponseDTO toResponse(StorageRack rack) {
        return new StorageRackResponseDTO(rack.getId(), rack.getName(), rack.getLocation(), rack.getCapacity(), rack.getNotes());
    }
}
