package com.faeiq.ClothNCare.common.importexport;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class ImportResult {
    private int created;
    private int updated;
    private int skipped;
    private List<String> errors = new ArrayList<>();
}