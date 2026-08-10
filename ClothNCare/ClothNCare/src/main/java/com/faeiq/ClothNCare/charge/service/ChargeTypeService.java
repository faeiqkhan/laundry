package com.faeiq.ClothNCare.charge.service;

import com.faeiq.ClothNCare.charge.dto.ChargeTypeDTO;
import com.faeiq.ClothNCare.charge.dto.ChargeTypeResponseDTO;
import com.faeiq.ClothNCare.charge.entity.ChargeType;
import com.faeiq.ClothNCare.charge.entity.ChargeType.ChargeCalculation;
import com.faeiq.ClothNCare.charge.repository.ChargeTypeRepository;
import com.faeiq.ClothNCare.common.exception.BadRequestException;
import com.faeiq.ClothNCare.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ChargeTypeService {

    private final ChargeTypeRepository chargeTypeRepository;

    @Transactional(readOnly = true)
    public List<ChargeTypeResponseDTO> getAllChargeTypes() {
        return chargeTypeRepository.findAllByOrderByNameAsc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public ChargeTypeResponseDTO createChargeType(ChargeTypeDTO dto) {
        if (dto.getName() == null || dto.getName().isBlank()) {
            throw new BadRequestException("Charge type name is required");
        }
        ChargeType chargeType = new ChargeType();
        chargeType.setName(dto.getName().trim());
        chargeType.setCalculation(dto.getCalculation() == null ? ChargeCalculation.FLAT : dto.getCalculation());
        chargeType.setDefaultAmount(dto.getDefaultAmount() == null ? BigDecimal.ZERO : dto.getDefaultAmount());
        chargeType.setActive(dto.isActive());
        return toResponse(chargeTypeRepository.save(chargeType));
    }

    @Transactional
    public ChargeTypeResponseDTO updateChargeType(String id, ChargeTypeDTO dto) {
        ChargeType chargeType = chargeTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Charge type not found"));
        if (dto.getName() == null || dto.getName().isBlank()) {
            throw new BadRequestException("Charge type name is required");
        }
        chargeType.setName(dto.getName().trim());
        chargeType.setCalculation(dto.getCalculation() == null ? chargeType.getCalculation() : dto.getCalculation());
        chargeType.setDefaultAmount(dto.getDefaultAmount() == null ? chargeType.getDefaultAmount() : dto.getDefaultAmount());
        chargeType.setActive(dto.isActive());
        return toResponse(chargeTypeRepository.save(chargeType));
    }

    @Transactional
    public void deleteChargeType(String id) {
        if (!chargeTypeRepository.existsById(id)) {
            throw new ResourceNotFoundException("Charge type not found");
        }
        chargeTypeRepository.deleteById(id);
    }

    private ChargeTypeResponseDTO toResponse(ChargeType chargeType) {
        return new ChargeTypeResponseDTO(
                chargeType.getId(),
                chargeType.getName(),
                chargeType.getCalculation(),
                chargeType.getDefaultAmount(),
                chargeType.isActive()
        );
    }
}
