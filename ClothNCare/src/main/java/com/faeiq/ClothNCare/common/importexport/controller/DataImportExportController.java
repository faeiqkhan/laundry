package com.faeiq.ClothNCare.common.importexport.controller;

import com.faeiq.ClothNCare.common.ApiResponse;
import com.faeiq.ClothNCare.common.ApiResponseUtil;
import com.faeiq.ClothNCare.common.importexport.DataImportExportService;
import com.faeiq.ClothNCare.common.importexport.ImportResult;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@RestController
@RequestMapping("/api/data-io")
@RequiredArgsConstructor
public class DataImportExportController {

    private final DataImportExportService dataImportExportService;

    @GetMapping("/export/{resource}")
    public ResponseEntity<byte[]> export(@PathVariable String resource,
                                         @RequestParam(required = false, defaultValue = "xlsx") String format) {
        byte[] bytes = dataImportExportService.export(resource, format);
        return fileResponse(bytes, resource, format);
    }

    @GetMapping("/template/{resource}")
    public ResponseEntity<byte[]> template(@PathVariable String resource,
                                           @RequestParam(required = false, defaultValue = "xlsx") String format) {
        byte[] bytes = dataImportExportService.template(resource, format);
        return fileResponse(bytes, resource, format);
    }

    @PostMapping("/import/{resource}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<ImportResult>> importData(@PathVariable String resource,
                                                                @RequestParam("file") MultipartFile file,
                                                                @RequestParam(required = false, defaultValue = "") String format) {
        String resolvedFormat = format == null || format.isBlank()
                ? guessFormat(file.getOriginalFilename())
                : format;
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new com.faeiq.ClothNCare.common.exception.BadRequestException(
                    "Could not read uploaded file: " + e.getMessage());
        }
        ImportResult result = dataImportExportService.importData(resource, bytes, resolvedFormat);
        return ResponseEntity.ok(ApiResponseUtil.success(result,
                "Import completed: " + result.getCreated() + " created, "
                        + result.getUpdated() + " updated, "
                        + result.getSkipped() + " skipped"));
    }

    private ResponseEntity<byte[]> fileResponse(byte[] bytes, String resource, String format) {
        String ext = format != null && format.toLowerCase().contains("csv") ? "csv" : "xlsx";
        String mediaType = ext.equals("csv") ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        String date = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE);
        String filename = resource + "-" + date + "." + ext;
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(mediaType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(bytes);
    }

    private String guessFormat(String filename) {
        if (filename == null) {
            return "xlsx";
        }
        String lower = filename.toLowerCase();
        if (lower.endsWith(".csv")) {
            return "csv";
        }
        return "xlsx";
    }
}