package com.faeiq.ClothNCare.common.importexport;

import java.util.List;

public record DataTable(List<String> headers, List<List<String>> rows) {
}