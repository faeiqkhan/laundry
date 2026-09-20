package com.faeiq.ClothNCare.migration.dto;

import lombok.Builder;
import lombok.Data;
import lombok.Singular;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Result of an actual (non dry-run) Swash import. Only a summary; the audit
 * trail lives in the DataMigration ledger.
 */
@Data
@Builder
public class SwashExecutionResult {

    private LocalDateTime completedAt;

    private long customersCreated;

    private long customersMatched;

    private long ordersCreated;

    private long ordersSkipped;

    private long orderItemsCreated;

    private long expensesCreated;

    private long expensesSkipped;

    private long paymentsCreated;

    private long paymentsSkipped;

    private long paymentsUnmatched;

    private long orphanDetailsSkipped;

    private long invoiceCounterUpdatedTo;

    @Singular("warning")
    private List<String> warnings;

    @Singular("error")
    private List<String> errors;
}