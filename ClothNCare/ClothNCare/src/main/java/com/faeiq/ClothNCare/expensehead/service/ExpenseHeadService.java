package com.faeiq.ClothNCare.expensehead.service;

import com.faeiq.ClothNCare.common.exception.BadRequestException;
import com.faeiq.ClothNCare.common.exception.ResourceNotFoundException;
import com.faeiq.ClothNCare.expensehead.dto.ExpenseHeadDTO;
import com.faeiq.ClothNCare.expensehead.dto.ExpenseHeadResponseDTO;
import com.faeiq.ClothNCare.expensehead.entity.ExpenseHead;
import com.faeiq.ClothNCare.expensehead.repository.ExpenseHeadRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ExpenseHeadService {

    private final ExpenseHeadRepository expenseHeadRepository;

    @Transactional(readOnly = true)
    public List<ExpenseHeadResponseDTO> getAllHeads() {
        return expenseHeadRepository.findAllByOrderByNameAsc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public ExpenseHeadResponseDTO createHead(ExpenseHeadDTO dto) {
        if (dto.getName() == null || dto.getName().isBlank()) {
            throw new BadRequestException("Expense head name is required");
        }
        ExpenseHead head = new ExpenseHead();
        head.setName(dto.getName().trim());
        head.setDescription(dto.getDescription());
        head.setActive(dto.isActive());
        return toResponse(expenseHeadRepository.save(head));
    }

    @Transactional
    public ExpenseHeadResponseDTO updateHead(String id, ExpenseHeadDTO dto) {
        ExpenseHead head = expenseHeadRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Expense head not found"));
        if (dto.getName() == null || dto.getName().isBlank()) {
            throw new BadRequestException("Expense head name is required");
        }
        head.setName(dto.getName().trim());
        head.setDescription(dto.getDescription());
        head.setActive(dto.isActive());
        return toResponse(expenseHeadRepository.save(head));
    }

    @Transactional
    public void deleteHead(String id) {
        if (!expenseHeadRepository.existsById(id)) {
            throw new ResourceNotFoundException("Expense head not found");
        }
        expenseHeadRepository.deleteById(id);
    }

    private ExpenseHeadResponseDTO toResponse(ExpenseHead head) {
        return new ExpenseHeadResponseDTO(head.getId(), head.getName(), head.getDescription(), head.isActive());
    }
}
