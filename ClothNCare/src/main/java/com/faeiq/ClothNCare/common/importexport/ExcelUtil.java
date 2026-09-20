package com.faeiq.ClothNCare.common.importexport;

import com.faeiq.ClothNCare.common.exception.BadRequestException;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVPrinter;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public final class ExcelUtil {

    private ExcelUtil() {
    }

    public static byte[] toXlsx(String sheetName, List<String> headers, List<List<String>> rows) {
        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet(sheetName == null || sheetName.isBlank() ? "Data" : sheetName);
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.size(); i++) {
                headerRow.createCell(i).setCellValue(headers.get(i) == null ? "" : headers.get(i));
            }
            int index = 1;
            for (List<String> row : rows) {
                Row dataRow = sheet.createRow(index++);
                for (int i = 0; i < headers.size(); i++) {
                    String value = i < row.size() && row.get(i) != null ? row.get(i) : "";
                    dataRow.createCell(i).setCellValue(value);
                }
            }
            for (int i = 0; i < headers.size(); i++) {
                sheet.setColumnWidth(i, Math.min(12000, 2800 + headers.get(i).length() * 300));
            }
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new BadRequestException("Failed to create Excel file: " + e.getMessage());
        }
    }

    public static byte[] toCsv(List<String> headers, List<List<String>> rows) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            out.write(0xEF);
            out.write(0xBB);
            out.write(0xBF);
            OutputStreamWriter writer = new OutputStreamWriter(out, StandardCharsets.UTF_8);
            CSVFormat format = CSVFormat.DEFAULT.builder()
                    .setHeader(headers.toArray(new String[0]))
                    .build();
            try (CSVPrinter printer = new CSVPrinter(writer, format)) {
                for (List<String> row : rows) {
                    printer.printRecord(normalize(row, headers.size()));
                }
            }
            return out.toByteArray();
        } catch (IOException e) {
            throw new BadRequestException("Failed to create CSV file: " + e.getMessage());
        }
    }

    public static DataTable read(byte[] data, String format) {
        String normalized = format == null ? "" : format.trim().toLowerCase();
        if (normalized.contains("csv")) {
            return fromCsv(data);
        }
        if (normalized.contains("xls")) {
            return fromXlsx(data);
        }
        throw new BadRequestException("Unsupported format: " + format + ". Use xlsx or csv.");
    }

    private static DataTable fromXlsx(byte[] data) {
        try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(data))) {
            Sheet sheet = workbook.getSheetAt(0);
            List<String> headers = new ArrayList<>();
            List<List<String>> rows = new ArrayList<>();
            DataFormatter formatter = new DataFormatter();

            int first = sheet.getFirstRowNum();
            if (first < 0) {
                return new DataTable(new ArrayList<>(), new ArrayList<>());
            }

            Row header = sheet.getRow(first);
            int columnCount = 0;
            if (header != null) {
                columnCount = header.getLastCellNum();
                for (int i = 0; i < columnCount; i++) {
                    headers.add(header.getCell(i) == null ? "" : formatter.formatCellValue(header.getCell(i)).trim());
                }
            }

            for (int r = first + 1; r <= sheet.getLastRowNum(); r++) {
                Row row = sheet.getRow(r);
                if (row == null) {
                    continue;
                }
                List<String> values = new ArrayList<>();
                boolean hasValue = false;
                for (int i = 0; i < columnCount; i++) {
                    Cell cell = row.getCell(i);
                    String value = cell == null ? "" : formatter.formatCellValue(cell).trim();
                    values.add(value);
                    if (!value.isEmpty()) {
                        hasValue = true;
                    }
                }
                if (hasValue) {
                    rows.add(values);
                }
            }
            return new DataTable(headers, rows);
        } catch (IOException e) {
            throw new BadRequestException("Invalid Excel file: " + e.getMessage());
        }
    }

    private static DataTable fromCsv(byte[] data) {
        byte[] cleaned = data;
        if (cleaned.length >= 3 && (cleaned[0] & 0xFF) == 0xEF && (cleaned[1] & 0xFF) == 0xBB && (cleaned[2] & 0xFF) == 0xBF) {
            cleaned = Arrays.copyOfRange(cleaned, 3, cleaned.length);
        }
        try (Reader reader = new InputStreamReader(new ByteArrayInputStream(cleaned), StandardCharsets.UTF_8);
             CSVParser parser = CSVFormat.DEFAULT.builder()
                     .setHeader()
                     .setSkipHeaderRecord(true)
                     .build()
                     .parse(reader)) {
            List<String> headers = new ArrayList<>(parser.getHeaderNames());
            List<List<String>> rows = new ArrayList<>();
            for (var record : parser) {
                List<String> values = new ArrayList<>();
                boolean hasValue = false;
                for (String header : headers) {
                    String value = record.get(header) == null ? "" : record.get(header).trim();
                    values.add(value);
                    if (!value.isEmpty()) {
                        hasValue = true;
                    }
                }
                if (hasValue) {
                    rows.add(values);
                }
            }
            return new DataTable(headers, rows);
        } catch (IOException | IllegalArgumentException e) {
            throw new BadRequestException("Invalid CSV file: " + e.getMessage());
        }
    }

    private static List<String> normalize(List<String> row, int size) {
        List<String> result = new ArrayList<>(size);
        for (int i = 0; i < size; i++) {
            result.add(i < row.size() && row.get(i) != null ? row.get(i) : "");
        }
        return result;
    }
}