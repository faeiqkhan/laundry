package com.faeiq.ClothNCare.pricelist.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
public class PriceListResponseDTO {

    private String id;

    private String name;

    private String description;

    private boolean active;

    private LocalDateTime createdAt;

    private List<PriceListEntryDTO> entries;
}
