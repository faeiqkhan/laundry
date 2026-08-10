package com.faeiq.ClothNCare.storage.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Data;

@Entity
@Data
public class StorageBag {

    public enum BagStatus {
        AVAILABLE,
        ASSIGNED,
        RETURNED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String bagNumber;

    private String size;

    private BagStatus status = BagStatus.AVAILABLE;

    private String notes;
}
