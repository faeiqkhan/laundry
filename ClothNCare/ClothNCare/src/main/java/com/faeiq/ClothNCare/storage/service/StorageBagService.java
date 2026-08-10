package com.faeiq.ClothNCare.storage.service;

import com.faeiq.ClothNCare.common.exception.BadRequestException;
import com.faeiq.ClothNCare.common.exception.ConflictException;
import com.faeiq.ClothNCare.common.exception.ResourceNotFoundException;
import com.faeiq.ClothNCare.storage.dto.StorageBagDTO;
import com.faeiq.ClothNCare.storage.dto.StorageBagResponseDTO;
import com.faeiq.ClothNCare.storage.entity.StorageBag;
import com.faeiq.ClothNCare.storage.entity.StorageBag.BagStatus;
import com.faeiq.ClothNCare.storage.repository.StorageBagRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class StorageBagService {

    private final StorageBagRepository storageBagRepository;

    @Transactional(readOnly = true)
    public List<StorageBagResponseDTO> getAllBags() {
        return storageBagRepository.findAllByOrderByBagNumberAsc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public StorageBagResponseDTO createBag(StorageBagDTO dto) {
        if (dto.getBagNumber() == null || dto.getBagNumber().isBlank()) {
            throw new BadRequestException("Bag number is required");
        }
        String bagNumber = dto.getBagNumber().trim();
        storageBagRepository.findByBagNumberIgnoreCase(bagNumber)
                .ifPresent(existing -> {
                    throw new ConflictException("Bag number already exists");
                });
        StorageBag bag = new StorageBag();
        bag.setBagNumber(bagNumber);
        bag.setSize(dto.getSize());
        bag.setStatus(dto.getStatus() == null ? BagStatus.AVAILABLE : dto.getStatus());
        bag.setNotes(dto.getNotes());
        return toResponse(storageBagRepository.save(bag));
    }

    @Transactional
    public StorageBagResponseDTO updateBag(String id, StorageBagDTO dto) {
        StorageBag bag = storageBagRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Storage bag not found"));
        if (dto.getBagNumber() == null || dto.getBagNumber().isBlank()) {
            throw new BadRequestException("Bag number is required");
        }
        String bagNumber = dto.getBagNumber().trim();
        storageBagRepository.findByBagNumberIgnoreCase(bagNumber)
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> {
                    throw new ConflictException("Bag number already exists");
                });
        bag.setBagNumber(bagNumber);
        bag.setSize(dto.getSize());
        bag.setStatus(dto.getStatus() == null ? bag.getStatus() : dto.getStatus());
        bag.setNotes(dto.getNotes());
        return toResponse(storageBagRepository.save(bag));
    }

    @Transactional
    public void deleteBag(String id) {
        if (!storageBagRepository.existsById(id)) {
            throw new ResourceNotFoundException("Storage bag not found");
        }
        storageBagRepository.deleteById(id);
    }

    private StorageBagResponseDTO toResponse(StorageBag bag) {
        return new StorageBagResponseDTO(bag.getId(), bag.getBagNumber(), bag.getSize(), bag.getStatus(), bag.getNotes());
    }
}
