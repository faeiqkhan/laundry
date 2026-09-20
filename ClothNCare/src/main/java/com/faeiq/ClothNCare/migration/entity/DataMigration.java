package com.faeiq.ClothNCare.migration.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Idempotency/audit ledger for the Swash import (ABCC.txt rule 55).
 * Every source record (swash order/invoice number, customer, expense row)
 * is logged  before it is created so re-running the migration never imports
 * the same business record twice.
 */
@Entity
@Data
public class DataMigration {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String sourceSystem = "SWASH";

    private String sourceType;

    private String sourceReference;

    private String targetId;

    private LocalDateTime importedAt;

    private String status = "IMPORTED";

    private String errorMessage;
}