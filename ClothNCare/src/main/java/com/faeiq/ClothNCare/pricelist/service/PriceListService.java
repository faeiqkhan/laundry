package com.faeiq.ClothNCare.pricelist.service;

import com.faeiq.ClothNCare.common.exception.BadRequestException;
import com.faeiq.ClothNCare.common.exception.ConflictException;
import com.faeiq.ClothNCare.common.exception.ResourceNotFoundException;
import com.faeiq.ClothNCare.pricelist.dto.PriceListDTO;
import com.faeiq.ClothNCare.pricelist.dto.PriceListEntryDTO;
import com.faeiq.ClothNCare.pricelist.dto.PriceListResponseDTO;
import com.faeiq.ClothNCare.pricelist.entity.PriceList;
import com.faeiq.ClothNCare.pricelist.entity.PriceListEntry;
import com.faeiq.ClothNCare.pricelist.repository.PriceListEntryRepository;
import com.faeiq.ClothNCare.pricelist.repository.PriceListRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class PriceListService {

    private final PriceListRepository priceListRepository;
    private final PriceListEntryRepository entryRepository;

    @Transactional(readOnly = true)
    public List<PriceListResponseDTO> getAllPriceLists() {
        return priceListRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public PriceListResponseDTO getPriceListById(String id) {
        PriceList priceList = priceListRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Price list not found"));
        return toResponse(priceList);
    }

    @Transactional
    public PriceListResponseDTO createPriceList(PriceListDTO dto) {
        validate(dto, null);
        PriceList priceList = new PriceList();
        priceList.setName(dto.getName().trim());
        priceList.setDescription(dto.getDescription());
        priceList.setActive(false);
        priceList.setCreatedAt(LocalDateTime.now());
        PriceList saved = priceListRepository.save(priceList);
        saveEntries(saved, dto);
        return toResponse(saved);
    }

    @Transactional
    public PriceListResponseDTO updatePriceList(String id, PriceListDTO dto) {
        PriceList priceList = priceListRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Price list not found"));
        validate(dto, id);
        priceList.setName(dto.getName().trim());
        priceList.setDescription(dto.getDescription());
        entryRepository.deleteByPriceListId(id);
        saveEntries(priceList, dto);
        return toResponse(priceListRepository.save(priceList));
    }

    @Transactional
    public void deletePriceList(String id) {
        if (!priceListRepository.existsById(id)) {
            throw new ResourceNotFoundException("Price list not found");
        }
        entryRepository.deleteByPriceListId(id);
        priceListRepository.deleteById(id);
    }

    @Transactional
    public PriceListResponseDTO activatePriceList(String id) {
        PriceList priceList = priceListRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Price list not found"));
        priceListRepository.findByActiveTrue().stream()
                .filter(other -> !other.getId().equals(id))
                .forEach(other -> other.setActive(false));
        priceList.setActive(true);
        return toResponse(priceListRepository.save(priceList));
    }

    private void validate(PriceListDTO dto, String currentId) {
        if (dto.getName() == null || dto.getName().isBlank()) {
            throw new BadRequestException("Price list name is required");
        }
        String name = dto.getName().trim();
        priceListRepository.findByNameIgnoreCase(name)
                .filter(existing -> currentId == null || !existing.getId().equals(currentId))
                .ifPresent(existing -> {
                    throw new ConflictException("A price list with this name already exists");
                });
        if (dto.getEntries() == null || dto.getEntries().isEmpty()) {
            throw new BadRequestException("Price list must contain at least one item");
        }
        Set<String> seen = new HashSet<>();
        for (PriceListEntryDTO entry : dto.getEntries()) {
            if (entry.getItemType() == null) {
                throw new BadRequestException("Item type is required for each entry");
            }
            if (entry.getItemName() == null || entry.getItemName().isBlank()) {
                throw new BadRequestException("Item name is required for each entry");
            }
            if (entry.getPrice() == null || entry.getPrice().compareTo(BigDecimal.ZERO) < 0) {
                throw new BadRequestException("Item price must be zero or greater");
            }
            String key = entry.getItemType().name() + "|" + entry.getItemName().trim().toLowerCase();
            if (!seen.add(key)) {
                throw new ConflictException("Duplicate item in price list: " + entry.getItemName().trim());
            }
        }
    }

    private void saveEntries(PriceList priceList, PriceListDTO dto) {
        for (PriceListEntryDTO entryDTO : dto.getEntries()) {
            PriceListEntry entry = new PriceListEntry();
            entry.setPriceListId(priceList.getId());
            entry.setItemType(entryDTO.getItemType());
            entry.setItemName(entryDTO.getItemName().trim());
            entry.setPrice(entryDTO.getPrice());
            entryRepository.save(entry);
        }
    }

    private PriceListResponseDTO toResponse(PriceList priceList) {
        List<PriceListEntryDTO> entries = entryRepository
                .findAllByPriceListIdOrderByItemNameAsc(priceList.getId()).stream()
                .map(entry -> new PriceListEntryDTO(entry.getItemType(), entry.getItemName(), entry.getPrice()))
                .toList();
        return new PriceListResponseDTO(
                priceList.getId(),
                priceList.getName(),
                priceList.getDescription(),
                priceList.isActive(),
                priceList.getCreatedAt(),
                entries
        );
    }
}
