package com.faeiq.ClothNCare.pricelist.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Data;

import java.math.BigDecimal;

@Entity
@Data
public class PriceListEntry {

    public enum EntryType {
        SERVICE,
        PRODUCT
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String priceListId;

    private EntryType itemType;

    private String itemName;

    private BigDecimal price;
}
