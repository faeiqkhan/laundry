package com.faeiq.ClothNCare.storage.dto;

import com.faeiq.ClothNCare.storage.entity.StorageBag.BagStatus;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class StorageBagResponseDTO {
    private String id;
    private String bagNumber;
    private String size;
    private BagStatus status;
    private String notes;
}
