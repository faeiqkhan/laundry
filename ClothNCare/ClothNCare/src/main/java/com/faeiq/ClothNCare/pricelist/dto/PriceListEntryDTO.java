package com.faeiq.ClothNCare.pricelist.dto;

import com.faeiq.ClothNCare.pricelist.entity.PriceListEntry.EntryType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PriceListEntryDTO {

    private EntryType itemType;

    private String itemName;

    private BigDecimal price;
}
