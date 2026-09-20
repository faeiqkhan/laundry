package com.faeiq.ClothNCare.storage.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class StorageRackResponseDTO {
    private String id;
    private String name;
    private String location;
    private int capacity;
    private String notes;
}
