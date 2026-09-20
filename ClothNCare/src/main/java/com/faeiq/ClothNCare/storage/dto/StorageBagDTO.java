package com.faeiq.ClothNCare.storage.dto;

import com.faeiq.ClothNCare.storage.entity.StorageBag.BagStatus;
import lombok.Data;

@Data
public class StorageBagDTO {

    private String bagNumber;

    private String size;

    private BagStatus status;

    private String notes;
}
