package com.faeiq.ClothNCare.migration.parse;

import com.faeiq.ClothNCare.migration.model.BookedLaundryRow;
import com.faeiq.ClothNCare.migration.model.ExpenseRow;
import com.faeiq.ClothNCare.migration.model.InvoiceRow;
import com.faeiq.ClothNCare.migration.model.OrderDetailRow;
import com.faeiq.ClothNCare.migration.model.PaymentReceivedRow;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.PushbackInputStream;
import java.io.Reader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.BiFunction;

/**
 * Parses the raw Swash exports (ABCC.txt rule 59: inspect the real files, never
 * guess column names). Headers are matched case/space-insensitively so renamed
 * columns still bind; the Invoices file has a duplicated "Status" header, which
 * is tolerated by keeping the first occurrence for the order status. Row-level
 * parse problems never abort the run -- they are collected and reported so the
 * migration report surfaces exactly what could not be safely interpreted.
 */
public final class SwashCsvParser {

    private static final DateTimeFormatter DATE_DMY = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter DATE_SLASH_SINGLE = DateTimeFormatter.ofPattern("d/M/yyyy");
    private static final DateTimeFormatter DATE_ISO = DateTimeFormatter.ISO_LOCAL_DATE;
    private static final DateTimeFormatter DATETIME_DMY = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");
    private static final DateTimeFormatter DATETIME_DMY_MIN = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final DateTimeFormatter DATETIME_ISO = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final DateTimeFormatter DATETIME_ISO_MIN = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private SwashCsvParser() {
    }

    public static List<SwashParseIssue> parseBooked(byte[] csv, List<BookedLaundryRow> out) {
        return parseEach(csv, "BookedLaundry", (rec, idx) -> new BookedLaundryRow(
                str(rec, idx, "Customer Name"),
                str(rec, idx, "Mobile No"),
                str(rec, idx, "Address"),
                date(rec, idx, "Order Date"),
                date(rec, idx, "Delivery Date"),
                dateTime(rec, idx, "created Date&Time", "created Date&time", "Created Date&Time", "created date&time"),
                str(rec, idx, "Order No"),
                decimal(rec, idx, "Addn Charges"),
                decimal(rec, idx, "Discount"),
                decimal(rec, idx, "Total Amount"),
                str(rec, idx, "Created By"),
                str(rec, idx, "Status"),
                str(rec, idx, "orderFrom", "Order From")), out);
    }

    public static List<SwashParseIssue> parseInvoices(byte[] csv, List<InvoiceRow> out) {
        return parseEach(csv, "Invoices", (rec, idx) -> new InvoiceRow(
                str(rec, idx, "Customer Name"),
                str(rec, idx, "Mobile No"),
                str(rec, idx, "Address"),
                dateTime(rec, idx, "created Date&Time", "created Date&time", "Created Date&Time", "created date&time"),
                date(rec, idx, "Invoice Date"),
                date(rec, idx, "Delivery Date"),
                str(rec, idx, "Invoice No"),
                decimal(rec, idx, "Total Discount"),
                decimal(rec, idx, "Additional Charges", "Additional Charges "),
                decimal(rec, idx, "Total Amount"),
                str(rec, idx, "Status"),
                str(rec, idx, "Created By"),
                str(rec, idx, "isinvoicesource By", "isInvoicesource By", "Invoice Source", "Source By")), out);
    }

    public static List<SwashParseIssue> parseOrderDetails(byte[] csv, List<OrderDetailRow> out) {
        return parseEach(csv, "OrderDetails", (rec, idx) -> new OrderDetailRow(
                str(rec, idx, "customer_name"),
                str(rec, idx, "Order No"),
                date(rec, idx, "Order Date"),
                date(rec, idx, "Delivery Date"),
                str(rec, idx, "Product Name"),
                str(rec, idx, "Service"),
                str(rec, idx, "Unit"),
                decimal(rec, idx, "Quantity"),
                decimal(rec, idx, "Price"),
                decimal(rec, idx, "Total Amount")), out);
    }

    public static List<SwashParseIssue> parseExpenses(byte[] csv, List<ExpenseRow> out) {
        return parseEach(csv, "Expenses", (rec, idx) -> new ExpenseRow(
                str(rec, idx, "Expense"),
                str(rec, idx, "Employee"),
                str(rec, idx, "Details"),
                decimal(rec, idx, "Amount"),
                dateTime(rec, idx, "createddate", "created date", "createdDate", "Created Date"),
                date(rec, idx, "expensedate", "expense date", "Expense Date"),
                str(rec, idx, "Description"),
                str(rec, idx, "isActive", "Is Active")), out);
    }

    public static List<SwashParseIssue> parsePayments(byte[] csv, List<PaymentReceivedRow> out) {
        return parseEach(csv, "Payments", (rec, idx) -> new PaymentReceivedRow(
                str(rec, idx, "Customer Name"),
                str(rec, idx, "Mobile No"),
                str(rec, idx, "Document No", "DocumentNo", "Invoice No"),
                dateTime(rec, idx, "created Date&Time", "created Date&time", "Created Date&Time", "created date&time"),
                date(rec, idx, "Payment Date", "payment date", "Paid Date"),
                str(rec, idx, "Description"),
                str(rec, idx, "Payment Type"),
                decimal(rec, idx, "Discount Amount"),
                decimal(rec, idx, "Received Amount", "Paid Amount"),
                decimal(rec, idx, "Total Amount"),
                str(rec, idx, "ispaymentsource", "Payment Source", "Source")), out);
    }

    private static <T> List<SwashParseIssue> parseEach(byte[] csv, String source,
                                                       java.util.function.BiFunction<CSVRecord, Map<String, Integer>, T> mapper,
                                                       List<T> out) {
        List<SwashParseIssue> issues = new ArrayList<>();
        if (csv == null || csv.length == 0) {
            return issues;
        }
        CSVFormat format = CSVFormat.DEFAULT.builder()
                .setSkipHeaderRecord(true)
                .setHeader()
                .setIgnoreEmptyLines(true)
                .setTrim(true)
                .setIgnoreSurroundingSpaces(true)
                .setDuplicateHeaderMode(org.apache.commons.csv.DuplicateHeaderMode.ALLOW_ALL)
                .build();
        try (CSVParser parser = format.parse(readerNoBom(new ByteArrayInputStream(csv)))) {
            Map<String, Integer> idx = firstHeaderIndexes(parser.getHeaderNames());
            int row = 1;
            for (CSVRecord record : parser) {
                row++;
                try {
                    out.add(mapper.apply(record, idx));
                } catch (SwashFieldException ex) {
                    issues.add(new SwashParseIssue(source, row, ex.getType(),
                            ex.getField(), ex.getValue(), ex.getMessage()));
                }
            }
        } catch (IOException ex) {
            issues.add(new SwashParseIssue(source, 0, "READ_ERROR", null, null,
                    "Could not read CSV file: " + ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            issues.add(new SwashParseIssue(source, 0, "MALFORMED", null, null,
                    "File is not a valid CSV: " + ex.getMessage()));
        }
        return issues;
    }

    private static Map<String, Integer> firstHeaderIndexes(List<String> headers) {
        Map<String, Integer> idx = new HashMap<>();
        if (headers != null) {
            for (int i = 0; i < headers.size(); i++) {
                String key = normalize(headers.get(i));
                if (key != null && !key.isBlank() && !idx.containsKey(key)) {
                    idx.put(key, i);
                }
            }
        }
        return idx;
    }

    private static String str(CSVRecord rec, Map<String, Integer> idx, String... aliases) {
        Integer column = resolve(idx, aliases);
        if (column == null || column >= rec.size()) {
            return null;
        }
        String value = rec.get(column);
        return value == null ? null : value.trim();
    }

    private static BigDecimal decimal(CSVRecord rec, Map<String, Integer> idx, String... aliases)
            throws SwashFieldException {
        String raw = str(rec, idx, aliases);
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return new BigDecimal(raw.replace(",", "").trim());
        } catch (NumberFormatException ex) {
            throw new SwashFieldException("INVALID_NUMBER", aliases[0], raw,
                    "Not a valid number: '" + raw + "'");
        }
    }

    private static LocalDate date(CSVRecord rec, Map<String, Integer> idx, String... aliases)
            throws SwashFieldException {
        String raw = str(rec, idx, aliases);
        if (raw == null || raw.isBlank()) {
            return null;
        }
        for (DateTimeFormatter f : List.of(DATE_DMY, DATE_SLASH_SINGLE, DATE_ISO)) {
            try {
                return LocalDate.parse(raw, f);
            } catch (DateTimeParseException ignore) {
                // try next formatter
            }
        }
        throw new SwashFieldException("INVALID_DATE", aliases[0], raw,
                "Unrecognized date '" + raw + "' (expected dd/MM/yyyy or yyyy-MM-dd)");
    }

    private static LocalDateTime dateTime(CSVRecord rec, Map<String, Integer> idx, String... aliases)
            throws SwashFieldException {
        String raw = str(rec, idx, aliases);
        if (raw == null || raw.isBlank()) {
            return null;
        }
        for (DateTimeFormatter f : List.of(DATETIME_DMY, DATETIME_DMY_MIN, DATETIME_ISO, DATETIME_ISO_MIN)) {
            try {
                return LocalDateTime.parse(raw, f);
            } catch (DateTimeParseException ignore) {
                // try next formatter
            }
        }
        try {
            return date(rec, idx, aliases).atStartOfDay();
        } catch (SwashFieldException ex) {
            throw new SwashFieldException("INVALID_DATE", aliases[0], raw,
                    "Unrecognized date-time '" + raw + "'");
        }
    }

    private static Integer resolve(Map<String, Integer> idx, String[] aliases) {
        for (String alias : aliases) {
            String key = normalize(alias);
            if (key != null && idx.containsKey(key)) {
                return idx.get(key);
            }
        }
        return null;
    }

    private static String normalize(String header) {
        if (header == null) {
            return null;
        }
        return header.replace("&", "and").trim().toLowerCase();
    }

    /**
     * Returns a UTF-8 reader that skips a leading BOM (byte order mark) if
     * present, since commons-csv requires exact header matches and the BOM
     * character breaks alias resolution.
     */
    private static Reader readerNoBom(InputStream in) throws IOException {
        PushbackInputStream push = new PushbackInputStream(in, 3);
        byte[] bom = new byte[3];
        int read = push.read(bom, 0, 3);
        if (read == 3 && (bom[0] & 0xFF) == 0xEF && (bom[1] & 0xFF) == 0xBB && (bom[2] & 0xFF) == 0xBF) {
            // BOM detected and skipped
        } else if (read > 0) {
            push.unread(bom, 0, read);
        }
        return new InputStreamReader(push, StandardCharsets.UTF_8);
    }
}