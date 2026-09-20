package com.faeiq.ClothNCare.migration;

import com.faeiq.ClothNCare.migration.dto.SwashDryRunReport;
import com.faeiq.ClothNCare.migration.service.SwashMigrationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Assumptions;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Smoke test that runs the dry-run against the real Swash exports shipped in
 * the repository (swash-data/). It only reads, never imports.
 * <p>
 * swash-data/ holds client business data and is git-ignored, so on CI the
 * directory is absent and the test is skipped instead of failed.
 */
@SpringBootTest
@TestPropertySource(properties = {
        "jwt.secret=test-only-secret-key-for-context-load-tests",
        "migration.swash-data-dir=../../swash-data"
})
class SwashMigrationDryRunIntegrationTest {

    @Autowired
    private SwashMigrationService migrationService;

    @Test
    void dryRunMatchesKnownFactsFromSwashExports() {
        Assumptions.assumeTrue(Files.isDirectory(Path.of("../../swash-data")),
                "swash-data/ not present; skipping dry-run smoke test");

        SwashDryRunReport report = migrationService.dryRunFromDefaultDirectory();

        SwashDryRunReport.Counts counts = report.getCounts();
        SwashDryRunReport.Reconciliation reconciliation = report.getReconciliation();

        System.out.println("=== Migration dry-run smoke ===");
        System.out.println("bookedLaundryRows: " + counts.getBookedLaundryRows());
        System.out.println("invoicesFound:     " + counts.getInvoicesFound());
        System.out.println("orderDetailRows:   " + counts.getOrderDetailRows());
        System.out.println("uniqueOrderNumbers:" + counts.getUniqueOrderNumbers());
        System.out.println("expensesFound:     " + counts.getExpensesFound());
        System.out.println("uniqueCustomers:   " + counts.getUniqueCustomers());
        System.out.println("paymentsFound:     " + counts.getPaymentsFound());
        System.out.println("paymentsMatched:   " + counts.getPaymentsMatched());
        System.out.println("paymentsUnmatched: " + counts.getPaymentsUnmatched());
        System.out.println("matched:           " + reconciliation.getMatched());
        System.out.println("bookedOnly:        " + reconciliation.getBookedOnly());
        System.out.println("bookedOnlyInactive:" + reconciliation.getBookedOnlyInactive());
        System.out.println("invoiceOnly:       " + reconciliation.getInvoiceOnly());
        System.out.println("detailOnly:        " + reconciliation.getDetailOnly());
        System.out.println("ordersWithDetails: " + reconciliation.getOrdersWithDetails());
        System.out.println("ordersWithoutDetails: " + reconciliation.getOrdersWithoutDetails());
        System.out.println("unmatchedProducts: " + report.getUnmatchedProducts().size());
        System.out.println("invoiceNumberMin:  " + report.getInvoiceNumberMin());
        System.out.println("invoiceNumberMax:  " + report.getInvoiceNumberMax());
        System.out.println("recommendedCounter:" + report.getRecommendedInvoiceCounter());
        System.out.println("paymentMemos:      " + report.getPaymentMemos());
        System.out.println("warnings:          " + report.getWarnings().size());
        System.out.println("errors:            " + report.getErrors().size());

        assertEquals(counts.getBookedLaundryRows(), 3956L);
        assertEquals(counts.getInvoicesFound(), 3913L);
        assertEquals(counts.getOrderDetailRows(), 8224L);
        assertEquals(counts.getExpensesFound(), 17L);
        assertEquals(counts.getPaymentsFound(), 2725L);
        assertEquals(counts.getPaymentsMatched(), 2725L);
        assertEquals(counts.getPaymentsUnmatched(), 0L);
        assertEquals(reconciliation.getMatched(), 3913L);
        assertEquals(reconciliation.getBookedOnly(), 43L);
        assertEquals(reconciliation.getBookedOnlyInactive(), 40L);
        assertEquals(reconciliation.getInvoiceOnly(), 0L);
        assertEquals(reconciliation.getDetailOnly(), 7L);
        assertEquals(report.getInvoiceNumberMin(), 1543L);
        assertEquals(report.getInvoiceNumberMax(), 5515L);
        assertTrue(report.getRecommendedInvoiceCounter() >= report.getInvoiceNumberMax());
        assertTrue(report.getPaymentMemos().size() >= 1);
        assertTrue(report.getPaymentMemos().get(0).contains("2725"));
    }
}