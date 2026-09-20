package com.faeiq.ClothNCare.migration.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.Singular;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Full dry-run / migration report. Designed to be rendered directly by the
 * React admin screen. Fields are camelCase for the frontend.
 */
@Data
@Builder
public class SwashDryRunReport {

    private LocalDateTime generatedAt;

    private SourceFiles sourceFiles;

    private Counts counts;

    private Reconciliation reconciliation;

    private long duplicateInvoiceCount;
    @Singular("duplicateInvoice")
    private List<String> duplicateInvoiceNumbers;

    private long duplicateCustomerCount;
    @Singular("customerGroup")
    private List<CustomerGroup> duplicateCustomers;

    private long missingPhoneNumbers;

    private long invalidDates;

    private long invalidNumberCount;

    @Singular("unknownStatus")
    private List<String> unknownStatuses;

    @Singular("unknownService")
    private List<String> unknownServices;

    @Singular("invalidQuantity")
    private List<LineIssue> invalidQuantities;

    @Singular("invalidPrice")
    private List<LineIssue> invalidPrices;

    @Singular("lineTotalMismatch")
    private List<LineIssue> lineTotalMismatches;

    @Singular("invoiceTotalMismatch")
    private List<TotalMismatch> invoiceTotalMismatches;

    @Singular("orphanDetail")
    private List<String> orphanDetails;

    @Singular("importedPaymentMemo")
    private List<String> paymentMemos;

    @Singular("unmatchedProduct")
    private List<UnmatchedProduct> unmatchedProducts;

    private long invoiceNumberMin;

    private long invoiceNumberMax;

    private long recommendedInvoiceCounter;

    @Singular("statusMapping")
    private List<StatusMapping> statusMappings;

    @Singular("warning")
    private List<String> warnings;

    @Singular("error")
    private List<String> errors;

    @Data
    @Builder
    @AllArgsConstructor
    public static class SourceFiles {
        private String bookedLaundry;
        private String invoices;
        private String orderDetails;
        private String expenses;
        private String payments;
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class Counts {
        private long bookedLaundryRows;
        private long invoicesFound;
        private long uniqueOrderNumbers;
        private long orderDetailRows;
        private long uniqueCustomers;
        private long expensesFound;
        private long paymentsFound;
        private long paymentsMatched;
        private long paymentsUnmatched;
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class Reconciliation {
        private long matched;
        private long bookedOnly;
        private long bookedOnlyInactive;
        private long invoiceOnly;
        private long detailOnly;
        private long ordersWithDetails;
        private long ordersWithoutDetails;
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class CustomerGroup {
        private String normalizedPhone;
        private String displayPhone;
        @Singular("name")
        private List<String> names;
        private long sourceRecords;
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class LineIssue {
        private String orderNo;
        private String productName;
        private String service;
        private BigDecimal quantity;
        private BigDecimal price;
        private BigDecimal sourceTotal;
        private String message;
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class TotalMismatch {
        private String orderNo;
        private BigDecimal itemsTotal;
        private BigDecimal discount;
        private BigDecimal additionalCharges;
        private BigDecimal expectedTotal;
        private BigDecimal sourceTotal;
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class UnmatchedProduct {
        private String productName;
        private String service;
        private long lineCount;
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class StatusMapping {
        private String source;
        private String target;
        private long rows;
        private String note;
    }
}