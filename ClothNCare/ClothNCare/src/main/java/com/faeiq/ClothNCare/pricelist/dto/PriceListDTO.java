package com.faeiq.ClothNCare.pricelist.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class PriceListDTO {

    private String name;

    private String description;

    private List<PriceListEntryDTO> entries = new ArrayList<>();
}
