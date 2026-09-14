package com.faeiq.ClothNCare.migration.service;

import com.faeiq.ClothNCare.LaundryService.entity.LaundryService;
import com.faeiq.ClothNCare.LaundryService.repository.LaundryServiceRepository;
import com.faeiq.ClothNCare.common.exception.BadRequestException;
import com.faeiq.ClothNCare.customer.entity.Customer;
import com.faeiq.ClothNCare.customer.repository.CustomerRepository;
import com.faeiq.ClothNCare.expense.entity.Expense;
import com.faeiq.ClothNCare.expense.repository.ExpenseRepository;
import com.faeiq.ClothNCare.messaging.PhoneNumberUtil;
import com.faeiq.ClothNCare.migration.dto.SwashDryRunReport;
import com.faeiq.ClothNCare.migration.dto.SwashExecutionResult;
import com.faeiq.ClothNCare.migration.entity.DataMigration;
import com.faeiq.ClothNCare.migration.model.BookedLaundryRow;
import com.faeiq.ClothNCare.migration.model.ExpenseRow;
import com.faeiq.ClothNCare.migration.model.InvoiceRow;
import com.faeiq.ClothNCare.migration.model.OrderDetailRow;
import com.faeiq.ClothNCare.migration.model.PaymentReceivedRow;
import com.faeiq.ClothNCare.migration.parse.SwashCsvParser;
import com.faeiq.ClothNCare.migration.parse.SwashParseIssue;
import com.faeiq.ClothNCare.migration.repository.DataMigrationRepository;
import com.faeiq.ClothNCare.orders.entity.Orders;
import com.faeiq.ClothNCare.orders.entity.OrdersItems;
import com.faeiq.ClothNCare.orders.entity.Payment;
import com.faeiq.ClothNCare.orders.entity.PaymentMethod;
import com.faeiq.ClothNCare.orders.entity.Status;
import com.faeiq.ClothNCare.orders.repository.OrdersRepository;
import com.faeiq.ClothNCare.product.entity.Product;
import com.faeiq.ClothNCare.product.repository.ProductRepository;
import com.faeiq.ClothNCare.settings.entity.AppSettings;
import com.faeiq.ClothNCare.settings.service.SettingsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.PushbackInputStream;
import java.io.Reader;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class SwashMigrationService {

    private static final Pattern BRACKET_CATEGORY = Pattern.compile("\\[([^\\]]+)\\]\\s*$");

    private final CustomerRepository customerRepository;
    private final OrdersRepository ordersRepository;
    private final ProductRepository productRepository;
    private final LaundryServiceRepository laundryServiceRepository;
    private final ExpenseRepository expenseRepository;
    private final SettingsService settingsService;
    private final DataMigrationRepository migrationRepository;
    private final Environment environment;

    @Value("${migration.swash-data-dir:./swash-data}")
    private String swashDataDir;

    @Value("${whatsapp.default-country:IN}")
    private String defaultCountry;

    // ------------------------------------------------------------------
    // Entry points
    // ------------------------------------------------------------------

    @Transactional(readOnly = true)
    public SwashDryRunReport dryRunFromDefaultDirectory() {
        SwashSourceFiles files = loadSourceFiles(Path.of(swashDataDir));
        return dryRun(files.booked, files.invoices, files.orderDetails, files.expenses, files.payments,
                files.bookedName, files.invoicesName, files.orderDetailsName, files.expensesName, files.paymentsName);
    }

    @Transactional(readOnly = true)
    public SwashDryRunReport dryRun(byte[] booked, byte[] invoices, byte[] orderDetails, byte[] expenses, byte[] payments,
                                    String bookedName, String invoicesName, String orderDetailsName, String expensesName, String paymentsName) {
        Workload w = parse(booked, invoices, orderDetails, expenses, payments,
                bookedName, invoicesName, orderDetailsName, expensesName, paymentsName);
        return buildReport(w);
    }

    @Transactional
    public SwashExecutionResult executeFromDefaultDirectory() {
        SwashSourceFiles files = loadSourceFiles(Path.of(swashDataDir));
        return execute(files.booked, files.invoices, files.orderDetails, files.expenses, files.payments);
    }

    @Transactional
    public SwashExecutionResult execute(byte[] booked, byte[] invoices, byte[] orderDetails, byte[] expenses, byte[] payments) {
        Workload w = parse(booked, invoices, orderDetails, expenses, payments,
                "provided", "provided", "provided", "provided", "provided");
        w.assertReadable();
        backupDatabase();

        ExecutionContext ctx = new ExecutionContext();
        Map<String, BookedLaundryRow> bookedByNo = indexBooked(w.bookedRows);
        Map<String, InvoiceRow> invoicesByNo = indexInvoices(w.invoiceRows);
        Map<String, List<OrderDetailRow>> detailsByNo = indexDetails(w.detailRows);

        List<OrderTarget> targets = new ArrayList<>();
        Set<String> orderNumbers = new LinkedHashSet<>(bookedByNo.keySet());
        orderNumbers.addAll(invoicesByNo.keySet());
        for (String orderNo : orderNumbers) {
            BookedLaundryRow b = bookedByNo.get(orderNo);
            InvoiceRow i = invoicesByNo.get(orderNo);
            OrderTarget t = new OrderTarget(orderNo, b, i, detailsByNo.get(orderNo));
            if (i != null) {
                t.decision = "INVOICE";
            } else if (b != null && "Y".equalsIgnoreCase(trim(b.status()))) {
                t.decision = "BOOKED";
            } else {
                t.decision = "SKIP_INACTIVE";
            }
            if (!"SKIP_INACTIVE".equals(t.decision)) {
                targets.add(t);
            } else {
                ctx.skippedOrders.add("Order " + orderNo + " skipped: inactive booked order without an invoice (manual review)");
                List<OrderDetailRow> skippedDetails = detailsByNo.get(orderNo);
                if (skippedDetails != null) {
                    ctx.orphanDetailsSkipped += skippedDetails.size();
                }
            }
        }

        importCustomers(targets, ctx);
        importOrders(targets, ctx);
        importPayments(w.paymentRows, ctx);
        importExpenses(w.expenseRows, ctx);
        updateInvoiceCounter(orderNumbers, ctx);

        return SwashExecutionResult.builder()
                .completedAt(LocalDateTime.now())
                .customersCreated(ctx.customersCreated)
                .customersMatched(ctx.customersMatched)
                .ordersCreated(ctx.ordersCreated)
                .ordersSkipped(ctx.ordersSkipped)
                .orderItemsCreated(ctx.orderItemsCreated)
                .expensesCreated(ctx.expensesCreated)
                .expensesSkipped(ctx.expensesSkipped)
                .paymentsCreated(ctx.paymentsCreated)
                .paymentsSkipped(ctx.paymentsSkipped)
                .paymentsUnmatched(ctx.paymentsUnmatched)
                .orphanDetailsSkipped((long) ctx.orphanDetailsSkipped)
                .invoiceCounterUpdatedTo(ctx.invoiceCounter)
                .warnings(ctx.skippedOrders)
                .errors(ctx.errors)
                .build();
    }

    @Transactional(readOnly = true)
    public Map<String, Long> migrationStatus() {
        Map<String, Long> status = new LinkedHashMap<>();
        status.put("invoicesImported", migrationRepository.countBySourceType("INVOICE"));
        status.put("customersImported", migrationRepository.countBySourceType("CUSTOMER"));
        status.put("expensesImported", migrationRepository.countBySourceType("EXPENSE"));
        status.put("paymentsImported", migrationRepository.countBySourceType("PAYMENT"));
        status.put("totalLedgerEntries", migrationRepository.count());
        return status;
    }

    // ------------------------------------------------------------------
    // Parsing + dry-run report
    // ------------------------------------------------------------------

    private Workload parse(byte[] booked, byte[] invoices, byte[] orderDetails, byte[] expenses, byte[] payments,
                           String bookedName, String invoicesName, String orderDetailsName, String expensesName, String paymentsName) {
        Workload w = new Workload();
        w.bookedName = bookedName;
        w.invoicesName = invoicesName;
        w.orderDetailsName = orderDetailsName;
        w.expensesName = expensesName;
        w.paymentsName = paymentsName;
        w.issues.addAll(SwashCsvParser.parseBooked(booked, w.bookedRows));
        w.issues.addAll(SwashCsvParser.parseInvoices(invoices, w.invoiceRows));
        w.issues.addAll(SwashCsvParser.parseOrderDetails(orderDetails, w.detailRows));
        w.issues.addAll(SwashCsvParser.parseExpenses(expenses, w.expenseRows));
        w.issues.addAll(SwashCsvParser.parsePayments(payments, w.paymentRows));
        return w;
    }

    private SwashDryRunReport buildReport(Workload w) {
        ReconcileResult r = reconcile(w);

        long paymentsMatched = 0L;
        long paymentsUnmatched = 0L;
        if (!w.paymentRows.isEmpty()) {
            Set<String> knownPhones = new HashSet<>();
            Set<String> knownNames = new HashSet<>();
            for (String key : r.customerGroups.keySet()) {
                if (key.startsWith("phone:")) {
                    knownPhones.add(key.substring("phone:".length()));
                }
            }
            for (ReconcileResult.CustomerGroup group : r.customerGroups.values()) {
                knownNames.addAll(group.names);
            }
            for (PaymentReceivedRow row : w.paymentRows) {
                String mobile = trim(row.mobile());
                String normalized = mobile == null || mobile.isBlank()
                        ? null : PhoneNumberUtil.toE164(mobile, defaultCountry);
                boolean known = (normalized != null && knownPhones.contains(normalized))
                        || (row.customerName() != null && !row.customerName().isBlank()
                        && knownNames.contains(normalizeKey(row.customerName())));
                if (known) {
                    paymentsMatched++;
                } else {
                    paymentsUnmatched++;
                }
            }
        }

        SwashDryRunReport.SwashDryRunReportBuilder builder = SwashDryRunReport.builder()
                .generatedAt(LocalDateTime.now())
                .sourceFiles(SwashDryRunReport.SourceFiles.builder()
                        .bookedLaundry(label(w.bookedName))
                        .invoices(label(w.invoicesName))
                        .orderDetails(label(w.orderDetailsName))
                        .expenses(label(w.expensesName))
                        .payments(label(w.paymentsName))
                        .build())
                .counts(SwashDryRunReport.Counts.builder()
                        .bookedLaundryRows(w.bookedRows.size())
                        .invoicesFound(w.invoiceRows.size())
                        .uniqueOrderNumbers(r.allOrderNumbers.size())
                        .orderDetailRows(w.detailRows.size())
                        .uniqueCustomers(r.customerGroups.size())
                        .expensesFound(w.expenseRows.size())
                        .paymentsFound(w.paymentRows.size())
                        .paymentsMatched(paymentsMatched)
                        .paymentsUnmatched(paymentsUnmatched)
                        .build())
                .reconciliation(SwashDryRunReport.Reconciliation.builder()
                        .matched(r.matched.size())
                        .bookedOnly(r.bookedOnly.size())
                        .bookedOnlyInactive(r.bookedOnlyInactive.size())
                        .invoiceOnly(r.invoiceOnly.size())
                        .detailOnly(r.detailOnly.size())
                        .ordersWithDetails(r.ordersWithDetails.size())
                        .ordersWithoutDetails(r.allOrderNumbers.size() - r.ordersWithDetails.size())
                        .build())
                .duplicateInvoiceCount(r.duplicateInvoiceNumbers.size())
                .duplicateInvoiceNumbers(r.duplicateInvoiceNumbers)
                .duplicateCustomerCount(r.customerGroups.size())
                .duplicateCustomers(r.customerGroups.values().stream()
                        .map(ReconcileResult.CustomerGroup::toReport)
                        .sorted(Comparator.comparing(cg -> cg.getDisplayPhone() == null ? "" : cg.getDisplayPhone()))
                        .toList())
                .missingPhoneNumbers(r.missingPhones)
                .invalidDates(w.issues.stream().filter(i -> "INVALID_DATE".equals(i.getType())).count())
                .invalidNumberCount(w.issues.stream().filter(i -> "INVALID_NUMBER".equals(i.getType())).count())
                .unknownStatuses(r.unknownStatuses)
                .unknownServices(r.unknownServices)
                .invalidQuantities(r.invalidQuantities)
                .invalidPrices(r.invalidPrices)
                .lineTotalMismatches(r.lineTotalMismatches)
                .invoiceTotalMismatches(r.invoiceTotalMismatches)
                .orphanDetails(r.detailOnly.stream().sorted().toList())
                .importedPaymentMemo(paymentMemo(w))
                .unmatchedProducts(r.unmatchedProducts)
                .statusMappings(r.statusMappings)
                .invoiceNumberMin(r.invoiceNumberMin)
                .invoiceNumberMax(r.invoiceNumberMax)
                .recommendedInvoiceCounter(nextInvoiceCounter(r.invoiceNumberMax))
                .warning("Booked Laundry 'Status' is an active/inactive flag (Y/N), not an order status. Order status is taken from the Invoices export ('In Progress').")
                .warning("Swash 'Created By' values (e.g. 250adminuser1) are not app users; imported orders have no createdBy user.")
                .warning("Booked Laundry 'orderFrom' (Web Portal / Rider App) has no Orders column; the value is not stored.")
                .warning("Swash 'Employee'/'Details' columns on expenses have no matching Expense entity fields; they are appended to the expense description to avoid data loss.");

        if (!r.bookedOnlyInactive.isEmpty()) {
            builder.warning(r.bookedOnlyInactive.size()
                    + " booked order(s) have inactive status (N) and no invoice; these are mapped to CANCELLED and flagged for manual review.");
        }
        if (!r.detailOnly.isEmpty()) {
            builder.error(r.detailOnly.size()
                    + " OrderDetails rows reference order numbers with no booked/invoice record (ORPHAN details). They are NOT imported; see the orphan list.");
        }
        w.issues.stream().filter(i -> "READ_ERROR".equals(i.getType()) || "MALFORMED".equals(i.getType()))
                .forEach(i -> builder.error(i.getMessage()));
        w.issues.stream().filter(i -> "INVALID_DATE".equals(i.getType()) || "INVALID_NUMBER".equals(i.getType()))
                .limit(20)
                .forEach(i -> builder.warning(label(i.getSource()) + " row " + i.getRowNumber() + ": " + i.getMessage()));

        if (paymentsUnmatched > 0) {
            builder.warning(paymentsUnmatched
                    + " payment row(s) could not be matched to any imported customer by phone or name. They are NOT imported (payments link to orders by customer + received amount; unresolved rows need manual review).");
        }

        if (w.bookedRows.isEmpty() && w.invoiceRows.isEmpty() && w.detailRows.isEmpty() && w.expenseRows.isEmpty()) {
            builder.error("No source data was provided. Upload the Swash exports (booked laundry, invoices, order details, expenses) or place them in the swash-data folder.");
        }
        return builder.build();
    }

    private String paymentMemo(Workload w) {
        if (w.paymentRows.isEmpty()) {
            return "No Payments (received) export was supplied; historical invoices are imported as UNPAID (no fake payments are created).";
        }
        return w.paymentRows.size()
                + " payment record(s) supplied (Payments received export). Each is matched to an order by customer (phone/name) + received amount, preferring the exact-total order nearest in date; when no exact match exists it is applied to the customer's oldest unpaid order. Payments that cannot be resolved to an imported customer are NOT imported.";
    }

    private ReconcileResult reconcile(Workload w) {
        Map<String, BookedLaundryRow> booked = indexBooked(w.bookedRows);
        Map<String, InvoiceRow> invoices = indexInvoices(w.invoiceRows);
        Map<String, List<OrderDetailRow>> details = indexDetails(w.detailRows);
        Map<String, Product> products = masterProducts();
        Set<String> services = masterServiceNames();

        ReconcileResult r = new ReconcileResult(products, services);

        Set<String> all = new LinkedHashSet<>();
        all.addAll(booked.keySet());
        all.addAll(invoices.keySet());
        all.addAll(details.keySet());
        r.allOrderNumbers = all;

        for (String orderNo : all) {
            boolean hasBooked = booked.containsKey(orderNo);
            boolean hasInvoice = invoices.containsKey(orderNo);
            boolean hasDetails = details.containsKey(orderNo);
            if (hasBooked && hasInvoice) {
                r.matched.add(orderNo);
            } else if (hasBooked) {
                r.bookedOnly.add(orderNo);
                if (!"Y".equalsIgnoreCase(trim(booked.get(orderNo).status()))) {
                    r.bookedOnlyInactive.add(orderNo);
                }
            } else if (hasInvoice) {
                r.invoiceOnly.add(orderNo);
            } else {
                r.detailOnly.add(orderNo);
            }
            if (hasDetails) {
                r.ordersWithDetails.add(orderNo);
            }
        }

        for (Map.Entry<String, List<OrderDetailRow>> entry : details.entrySet()) {
            String orderNo = entry.getKey();
            BigDecimal itemsTotal = BigDecimal.ZERO;
            for (OrderDetailRow row : entry.getValue()) {
                BigDecimal qty = row.quantity();
                BigDecimal price = row.price();
                BigDecimal sourceTotal = row.totalAmount();
                if (qty == null || qty.compareTo(BigDecimal.ZERO) <= 0) {
                    r.invalidQuantities.add(lineIssue(orderNo, row, "Invalid/missing quantity"));
                }
                if (price == null || price.compareTo(BigDecimal.ZERO) < 0) {
                    r.invalidPrices.add(lineIssue(orderNo, row, "Invalid/missing price"));
                }
                if (qty != null && price != null) {
                    BigDecimal computed = qty.multiply(price).setScale(2, RoundingMode.HALF_UP);
                    if (sourceTotal != null && computed.compareTo(sourceTotal.setScale(2, RoundingMode.HALF_UP)) != 0) {
                        r.lineTotalMismatches.add(SwashDryRunReport.LineIssue.builder()
                                .orderNo(orderNo).productName(trim(row.productName())).service(trim(row.service()))
                                .quantity(qty).price(price).sourceTotal(sourceTotal)
                                .message("qty x price = " + computed + " but source Total Amount = " + sourceTotal)
                                .build());
                    }
                    itemsTotal = itemsTotal.add(computed);
                }
            }
            BookedLaundryRow bookedRow = booked.get(orderNo);
            InvoiceRow invoiceRow = invoices.get(orderNo);
            BigDecimal discount = firstNonNull(value(bookedRow, r2 -> r2.discount()), value(invoiceRow, r2 -> r2.totalDiscount()));
            BigDecimal addn = firstNonNull(value(bookedRow, r2 -> r2.addnCharges()), value(invoiceRow, r2 -> r2.additionalCharges()));
            BigDecimal sourceTotal = value(bookedRow, r2 -> r2.totalAmount()) != null
                    ? value(bookedRow, r2 -> r2.totalAmount())
                    : value(invoiceRow, r2 -> r2.totalAmount());
            if (sourceTotal != null) {
                BigDecimal expected = itemsTotal
                        .subtract(discount == null ? BigDecimal.ZERO : discount)
                        .add(addn == null ? BigDecimal.ZERO : addn)
                        .setScale(2, RoundingMode.HALF_UP);
                if (expected.compareTo(sourceTotal.setScale(2, RoundingMode.HALF_UP)) != 0
                        && itemsTotal.setScale(2, RoundingMode.HALF_UP).compareTo(sourceTotal.setScale(2, RoundingMode.HALF_UP)) != 0) {
                    r.invoiceTotalMismatches.add(SwashDryRunReport.TotalMismatch.builder()
                            .orderNo(orderNo).itemsTotal(itemsTotal.setScale(2, RoundingMode.HALF_UP))
                            .discount(discount).additionalCharges(addn).expectedTotal(expected)
                            .sourceTotal(sourceTotal).build());
                }
            }
        }

        for (OrderDetailRow row : w.detailRows) {
            String service = trim(row.service());
            if (service != null && !service.isBlank() && !services.contains(normalizeKey(service))) {
                r.unknownServices.add(service);
            }
            String base = baseProductName(row.productName(), service);
            String key = base == null ? "" : normalizeKey(base);
            if (!products.containsKey(key)) {
                r.unmatched.merge(key, 1L, Long::sum);
            }
        }
        r.unmatchedProducts = r.unmatched.entrySet().stream()
                .map(e -> SwashDryRunReport.UnmatchedProduct.builder().productName(e.getKey()).lineCount(e.getValue()).build())
                .sorted(Comparator.comparing(SwashDryRunReport.UnmatchedProduct::getProductName))
                .toList();

        r.indexCustomers(w);

        // invoice duplicate + range
        Map<String, Long> invoiceCounts = new LinkedHashMap<>();
        for (InvoiceRow row : w.invoiceRows) {
            String no = trim(row.invoiceNo());
            if (no != null && !no.isBlank()) {
                invoiceCounts.merge(no, 1L, Long::sum);
            }
        }
        invoiceCounts.forEach((no, count) -> {
            if (count > 1) {
                r.duplicateInvoiceNumbers.add(no);
            }
            try {
                long n = Long.parseLong(no);
                r.invoiceNumberMin = Math.min(r.invoiceNumberMin, n);
                r.invoiceNumberMax = Math.max(r.invoiceNumberMax, n);
            } catch (NumberFormatException ignore) {
                r.unknownStatuses.add("non-numeric invoice number: " + no);
            }
        });
        if (r.invoiceNumberMax < r.invoiceNumberMin) {
            r.invoiceNumberMin = 0;
            r.invoiceNumberMax = 0;
        }

        r.statusMappings.add(mapping("In Progress", "PROCESSING", w.invoiceRows.size(),
                "All historical invoices export with status 'In Progress'"));
        r.statusMappings.add(mapping("Booked Status = Y", "RECEIVED (booked-only)",
                r.bookedOnly.size() - r.bookedOnlyInactive.size(),
                "Active booked orders without an invoice are imported as RECEIVED"));
        r.statusMappings.add(mapping("Booked Status = N", "CANCELLED (review)",
                r.bookedOnlyInactive.size(),
                "Inactive booked orders without invoices; flagged for manual review"));

        // unknown invoice source statuses kept distinct from modeled ones
        Set<String> modeled = Set.of("", "In Progress");
        for (InvoiceRow row : w.invoiceRows) {
            String st = trim(row.status());
            if (st != null && !st.isBlank() && !modeled.contains(st)) {
                r.unknownStatuses.add(st);
            }
        }
        return r;
    }

    private static SwashDryRunReport.LineIssue lineIssue(String orderNo, OrderDetailRow row, String message) {
        return SwashDryRunReport.LineIssue.builder()
                .orderNo(orderNo).productName(trim(row.productName())).service(trim(row.service()))
                .quantity(row.quantity()).price(row.price()).sourceTotal(row.totalAmount())
                .message(message).build();
    }

    private SwashDryRunReport.StatusMapping mapping(String source, String target, long rows, String note) {
        return SwashDryRunReport.StatusMapping.builder().source(source).target(target).rows(rows).note(note).build();
    }

    private String label(String value) {
        return value == null ? "not provided" : value;
    }

    // ------------------------------------------------------------------
    // Import executors
    // ------------------------------------------------------------------

    private void importCustomers(List<OrderTarget> targets, ExecutionContext ctx) {
        Map<String, Customer> byKey = new LinkedHashMap<>();
        for (OrderTarget t : targets) {
            BookedLaundryRow source = t.booked != null ? t.booked : fromInvoice(t.invoice);
            if (source == null) {
                continue;
            }
            String phone = trim(source.mobile());
            String normalized = phone == null ? null : PhoneNumberUtil.toE164(phone, defaultCountry);
            String key = normalized != null ? "phone:" + normalized : "name:" + normalizeKey(source.customerName());
            Customer customer = byKey.get(key);
            if (customer == null) {
                customer = findOrCreateCustomer(source, normalized, ctx);
                byKey.put(key, customer);
            }
            t.customer = customer;

            if (migrationRepository.findBySourceSystemAndSourceTypeAndSourceReference("SWASH", "CUSTOMER", key).isEmpty()) {
                recordMigration("CUSTOMER", key, customer.getId());
                ctx.customersCreated++;
            } else {
                ctx.customersMatched++;
            }
        }
    }

    private Customer findOrCreateCustomer(BookedLaundryRow source, String normalized, ExecutionContext ctx) {
        String rawPhone = trim(source.mobile());
        if (rawPhone != null) {
            Customer exact = customerRepository.findByPhone(rawPhone);
            if (exact != null) {
                return exact;
            }
            String norm = normalized;
            Customer normalizedMatch = customerRepository.findAll().stream()
                    .filter(c -> c.getPhone() != null && norm != null
                            && norm.equals(PhoneNumberUtil.toE164(c.getPhone(), defaultCountry)))
                    .findFirst().orElse(null);
            if (normalizedMatch != null) {
                return normalizedMatch;
            }
        }
        Customer customer = new Customer();
        customer.setName(trim(source.customerName()));
        customer.setPhone(rawPhone);
        customer.setAddress(trim(source.address()));
        customer.setCreated_at(LocalDateTime.now());
        return customerRepository.save(customer);
    }

    private void importOrders(List<OrderTarget> targets, ExecutionContext ctx) {
        for (OrderTarget t : targets) {
            if (migrationRepository.findBySourceSystemAndSourceTypeAndSourceReference("SWASH", "INVOICE",
                    t.orderNo).isPresent()) {
                ctx.ordersSkipped++;
                continue;
            }
            Orders order = buildOrder(t);
            Orders saved = ordersRepository.save(order);
            recordMigration("INVOICE", t.orderNo, saved.getId());
            ctx.ordersCreated++;
            ctx.orderItemsCreated += order.getItems().size();
        }
    }

    private void importPayments(List<PaymentReceivedRow> rows, ExecutionContext ctx) {
        Map<String, Customer> customerByPhone = new HashMap<>();
        Map<String, Customer> customerByName = new HashMap<>();
        for (Customer customer : customerRepository.findAll()) {
            if (customer.getPhone() != null && !customer.getPhone().isBlank()) {
                customerByPhone.putIfAbsent(customer.getPhone().trim(), customer);
                customerByPhone.putIfAbsent(PhoneNumberUtil.toE164(customer.getPhone(), defaultCountry), customer);
            }
            if (customer.getName() != null && !customer.getName().isBlank()) {
                customerByName.putIfAbsent(normalizeKey(customer.getName()), customer);
            }
        }

        for (int i = 0; i < rows.size(); i++) {
            PaymentReceivedRow row = rows.get(i);
            String reference = "payment-" + i;
            if (migrationRepository.findBySourceSystemAndSourceTypeAndSourceReference("SWASH", "PAYMENT",
                    reference).isPresent()) {
                ctx.paymentsSkipped++;
                continue;
            }

            Customer customer = resolvePaymentCustomer(row, customerByPhone, customerByName);
            if (customer == null) {
                ctx.paymentsUnmatched++;
                ctx.skippedOrders.add("Payment row " + (i + 1) + " (" + displayCustomer(row)
                        + ") skipped: no imported customer matches the phone/name.");
                continue;
            }

            List<Orders> orders = ordersRepository.findByCustomerId(customer.getId()).stream()
                    .filter(o -> o.getBalanceDue().compareTo(BigDecimal.ZERO) > 0)
                    .toList();
            if (orders.isEmpty()) {
                ctx.paymentsUnmatched++;
                ctx.skippedOrders.add("Payment row " + (i + 1) + " (" + displayCustomer(row)
                        + ") skipped: customer has no unpaid order to apply the payment to.");
                continue;
            }

            BigDecimal amount = row.receivedAmount() == null
                    ? BigDecimal.ZERO : row.receivedAmount().setScale(2, RoundingMode.HALF_UP);
            LocalDateTime paidAt = paymentPaidAt(row);

            Orders target = findExactPaymentOrder(orders, amount, paidAt);
            if (target == null) {
                target = orders.stream()
                        .min(Comparator.comparing(Orders::getCreated_at,
                                Comparator.nullsLast(Comparator.naturalOrder())))
                        .orElse(null);
            }
            if (target == null) {
                ctx.paymentsUnmatched++;
                ctx.skippedOrders.add("Payment row " + (i + 1) + " skipped: no payable order found.");
                continue;
            }

            BigDecimal balance = target.getBalanceDue();
            BigDecimal applied = amount.compareTo(balance) > 0 ? balance : amount;
            if (applied.compareTo(amount) < 0) {
                ctx.skippedOrders.add("Payment row " + (i + 1) + " (" + displayCustomer(row)
                        + "): received " + amount + " but only " + applied
                        + " applied to order " + target.getInvoice_number() + " (balance due). Excess is ignored.");
            }

            Payment payment = new Payment();
            payment.setOrder(target);
            payment.setAmount(applied);
            payment.setMethod(mapPaymentMethod(row.paymentType()));
            payment.setPaidAt(paidAt);
            if (target.getPayments() == null) {
                target.setPayments(new ArrayList<>());
            }
            target.getPayments().add(payment);
            BigDecimal paid = target.getPaid_amount() == null ? BigDecimal.ZERO : target.getPaid_amount();
            target.setPaid_amount(paid.add(payment.getAmount()).setScale(2, RoundingMode.HALF_UP));
            ordersRepository.save(target);
            recordMigration("PAYMENT", reference, payment.getId() == null ? target.getId() : payment.getId());
            ctx.paymentsCreated++;
        }
    }

    private Customer resolvePaymentCustomer(PaymentReceivedRow row, Map<String, Customer> byPhone,
                                            Map<String, Customer> byName) {
        String mobile = trim(row.mobile());
        if (mobile != null && !mobile.isBlank()) {
            Customer customer = byPhone.get(PhoneNumberUtil.toE164(mobile, defaultCountry));
            if (customer != null) {
                return customer;
            }
            customer = byPhone.get(mobile.trim());
            if (customer != null) {
                return customer;
            }
        }
        String name = trim(row.customerName());
        if (name != null && !name.isBlank()) {
            return byName.get(normalizeKey(name));
        }
        return null;
    }

    private String displayCustomer(PaymentReceivedRow row) {
        String name = trim(row.customerName());
        if (name != null && !name.isBlank()) {
            return name;
        }
        return trim(row.mobile());
    }

    private Orders findExactPaymentOrder(List<Orders> orders, BigDecimal received, LocalDateTime paidAt) {
        List<Orders> candidates = orders.stream()
                .filter(o -> received.compareTo(o.getBalanceDue()) == 0)
                .toList();
        if (candidates.isEmpty()) {
            return null;
        }
        if (candidates.size() == 1) {
            return candidates.get(0);
        }
        LocalDate refDate = paidAt == null ? null : paidAt.toLocalDate();
        Orders best = null;
        long bestDistance = Long.MAX_VALUE;
        boolean unique = true;
        for (Orders candidate : candidates) {
            long distance = refDate == null || candidate.getCreated_at() == null ? 0L
                    : Math.abs(ChronoUnit.DAYS.between(candidate.getCreated_at().toLocalDate(), refDate));
            if (distance < bestDistance) {
                bestDistance = distance;
                best = candidate;
                unique = true;
            } else if (distance == bestDistance && best != candidate) {
                unique = false;
            }
        }
        return unique ? best : null;
    }

    private PaymentMethod mapPaymentMethod(String type) {
        if (type == null || type.isBlank()) {
            return PaymentMethod.OTHER;
        }
        return switch (type.trim().toUpperCase(Locale.ROOT)) {
            case "CASH" -> PaymentMethod.CASH;
            case "CARD" -> PaymentMethod.CARD;
            case "UPI" -> PaymentMethod.UPI;
            case "ONLINE", "BANK", "BANK TRANSFER", "TRANSFER", "NEFT", "IMPS", "RTGS" -> PaymentMethod.BANK_TRANSFER;
            default -> PaymentMethod.OTHER;
        };
    }

    private LocalDateTime paymentPaidAt(PaymentReceivedRow row) {
        if (row.createdDateTime() != null) {
            return row.createdDateTime();
        }
        if (row.paymentDate() != null) {
            return row.paymentDate().atStartOfDay();
        }
        return LocalDateTime.now();
    }

    private Orders buildOrder(OrderTarget t) {
        BookedLaundryRow booked = t.booked;
        InvoiceRow invoice = t.invoice;
        BigDecimal discount = firstNonNull(value(booked, r -> r.discount()), value(invoice, r -> r.totalDiscount()));
        BigDecimal addn = firstNonNull(value(booked, r -> r.addnCharges()), value(invoice, r -> r.additionalCharges()));
        BigDecimal total = firstNonNull(value(booked, r -> r.totalAmount()), value(invoice, r -> r.totalAmount()));
        Status status = invoice != null ? Status.PROCESSING
                : ("Y".equalsIgnoreCase(trim(booked == null ? null : booked.status())) ? Status.RECEIVED : Status.CANCELLED);

        Orders order = new Orders();
        order.setCustomer(t.customer);
        order.setStatus(status);
        order.setInvoice_number(t.orderNo);
        order.setDiscount(discount == null ? BigDecimal.ZERO : discount);
        order.setAdditional_charges(addn == null ? BigDecimal.ZERO : addn);
        order.setTax_amount(BigDecimal.ZERO);
        order.setPaid_amount(BigDecimal.ZERO);
        order.setTotal_price(total == null ? BigDecimal.ZERO : total);

        BookedLaundryRow dateRow = booked != null ? booked : fromInvoice(invoice);
        order.setCreated_at(dateSource(booked, invoice));
        order.setExpected_delivery_date(deliveryDate(dateRow));

        List<OrdersItems> items = new ArrayList<>();
        List<OrderDetailRow> details = t.details == null ? List.of() : t.details;
        Map<String, Product> products = masterProducts();
        for (OrderDetailRow row : details) {
            OrdersItems item = new OrdersItems();
            item.setOrders(order);
            String base = baseProductName(row.productName(), row.service());
            Product product = base == null ? null : products.get(normalizeKey(base));
            item.setProduct_name(trim(row.productName()));
            item.setService_type(trim(row.service()));
            item.setProduct_type(categoryFromName(row.productName()));
            if (product != null) {
                item.setProduct_id(product.getId());
                item.setUom(product.getUnit() != null ? product.getUnit() : row.unit());
            } else {
                item.setUom(trim(row.unit()));
            }
            item.setQuantity(row.quantity() == null ? BigDecimal.ZERO : row.quantity());
            item.setPrice(row.price());
            items.add(item);
        }
        order.setItems(items);
        return order;
    }

    private LocalDateTime dateSource(BookedLaundryRow booked, InvoiceRow invoice) {
        if (booked != null && booked.createdDateTime() != null) {
            return booked.createdDateTime();
        }
        if (invoice != null && invoice.createdDateTime() != null) {
            return invoice.createdDateTime();
        }
        return LocalDateTime.now();
    }

    private LocalDate deliveryDate(BookedLaundryRow dateRow) {
        if (dateRow == null) {
            return null;
        }
        if (dateRow.deliveryDate() != null) {
            return dateRow.deliveryDate();
        }
        return dateRow.orderDate();
    }

    private void importExpenses(List<ExpenseRow> rows, ExecutionContext ctx) {
        int index = 1;
        for (ExpenseRow row : rows) {
            String reference = String.valueOf(index);
            index++;
            if (migrationRepository.findBySourceSystemAndSourceTypeAndSourceReference("SWASH", "EXPENSE",
                    reference).isPresent()) {
                ctx.expensesSkipped++;
                continue;
            }
            Expense expense = new Expense();
            expense.setCategory(trim(row.expense()));
            expense.setAmount(row.amount() == null ? BigDecimal.ZERO : row.amount());
            LocalDate date = row.expenseDate() != null ? row.expenseDate()
                    : (row.createdDateTime() == null ? LocalDate.now() : row.createdDateTime().toLocalDate());
            expense.setExpenseDate(date);
            expense.setCreatedAt(row.createdDateTime());
            expense.setDescription(buildExpenseDescription(row));
            Expense saved = expenseRepository.save(expense);
            recordMigration("EXPENSE", reference, saved.getId());
            ctx.expensesCreated++;
            if (!"Y".equalsIgnoreCase(trim(row.isActive()))) {
                ctx.skippedOrders.add("Expense row " + reference + " has isActive=" + row.isActive()
                        + " but the Expense entity has no active/inactive flag; it was imported as active. Review manually.");
            }
        }
    }

    private String buildExpenseDescription(ExpenseRow row) {
        StringBuilder description = new StringBuilder(trim(row.description()) == null ? "" : trim(row.description()));
        if (row.employee() != null && !row.employee().isBlank()) {
            String employee = "Employee: " + trim(row.employee());
            if (description.indexOf(employee) < 0) {
                if (description.length() > 0) {
                    description.append(" | ");
                }
                description.append(employee);
            }
        }
        if (row.details() != null && !row.details().isBlank()) {
            String details = "Details: " + trim(row.details());
            if (description.indexOf(details) < 0) {
                if (description.length() > 0) {
                    description.append(" | ");
                }
                description.append(details);
            }
        }
        return description.toString();
    }

    private void updateInvoiceCounter(Set<String> orderNumbers, ExecutionContext ctx) {
        long maxHistorical = 0L;
        for (String orderNo : orderNumbers) {
            try {
                maxHistorical = Math.max(maxHistorical, Long.parseLong(orderNo));
            } catch (NumberFormatException ignore) {
                // non-numeric historical numbers are preserved but do not move the counter
            }
        }
        AppSettings settings = settingsService.getSettings();
        long counter = Math.max(settings.getInvoiceCounter(), maxHistorical);
        if (counter != settings.getInvoiceCounter()) {
            settingsService.updateInvoiceCounter(counter);
        }
        ctx.invoiceCounter = counter;
    }

    private void recordMigration(String sourceType, String reference, String targetId) {
        DataMigration dm = new DataMigration();
        dm.setSourceType(sourceType);
        dm.setSourceReference(reference);
        dm.setTargetId(targetId);
        dm.setImportedAt(LocalDateTime.now());
        migrationRepository.save(dm);
    }

    private void backupDatabase() {
        try {
            String file = resolveSqlitePath();
            if (file == null || !Files.exists(Path.of(file))) {
                log.warn("Migration: could not locate sqlite database, skipping backup");
                return;
            }
            Path db = Path.of(file);
            Path backup = db.resolveSibling(db.getFileName() + ".bak-migration-" + LocalDateTime.now()
                    .format(DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss")));
            Files.copy(db, backup, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
            log.info("Migration backup created at {}", backup);
        } catch (IOException | RuntimeException ex) {
            log.warn("Migration backup failed: {}", ex.getMessage());
        }
    }

    private String resolveSqlitePath() {
        String url = environment.getProperty("spring.datasource.url");
        if (url == null || !url.contains("file:")) {
            return null;
        }
        String file = url.substring(url.indexOf("file:") + 5);
        int query = file.indexOf('?');
        return query >= 0 ? file.substring(0, query) : file;
    }

    // ------------------------------------------------------------------
    // Master data (current source of truth: repository, else root CSVs)
    // ------------------------------------------------------------------

    private Map<String, Product> masterProducts() {
        Map<String, Product> result = new HashMap<>();
        List<Product> fromDb = productRepository.findAll();
        if (fromDb.isEmpty()) {
            Path path = resolveMasterPath("products-import.csv");
            if (path != null) {
                parseMasterCsv(path, "Name", result);
            }
        } else {
            for (Product p : fromDb) {
                result.put(normalizeKey(p.getName()), p);
            }
        }
        return result;
    }

    private void parseMasterCsv(Path path, String column, Map<String, Product> result) {
        if (!Files.exists(path)) {
            return;
        }
        try {
            org.apache.commons.csv.CSVFormat format = masterCsvFormat();
            try (Reader reader = readerNoBom(Files.newInputStream(path));
                 var parser = format.parse(reader)) {
                for (org.apache.commons.csv.CSVRecord rec : parser) {
                    String name = rec.get(column);
                    if (name == null || name.isBlank()) {
                        continue;
                    }
                    Product p = new Product();
                    p.setName(trim(name));
                    p.setUnit(trim(rec.get("Unit")));
                    try {
                        p.setPrice(new BigDecimal(trim(rec.get("Price"))));
                    } catch (NumberFormatException ignore) {
                        p.setPrice(BigDecimal.ZERO);
                    }
                    result.put(normalizeKey(p.getName()), p);
                }
            }
        } catch (IOException ex) {
            log.warn("Could not parse {}: {}", path, ex.getMessage());
        }
    }

    private org.apache.commons.csv.CSVFormat masterCsvFormat() {
        return org.apache.commons.csv.CSVFormat.DEFAULT.builder()
                .setSkipHeaderRecord(true)
                .setIgnoreEmptyLines(true)
                .setHeader()
                .setTrim(true)
                .build();
    }

    private Set<String> masterServiceNames() {
        Set<String> names = new HashSet<>();
        List<LaundryService> fromDb = laundryServiceRepository.findAll();
        if (fromDb.isEmpty()) {
            Path path = resolveMasterPath("services-import.csv");
            if (path != null) {
                try {
                    org.apache.commons.csv.CSVFormat format = masterCsvFormat();
                    try (Reader reader = readerNoBom(Files.newInputStream(path));
                         var parser = format.parse(reader)) {
                        for (org.apache.commons.csv.CSVRecord rec : parser) {
                            String name = rec.get("Name");
                            if (name != null && !name.isBlank()) {
                                names.add(normalizeKey(trim(name)));
                            }
                        }
                    }
                } catch (IOException ex) {
                    log.warn("Could not parse services-import.csv: {}", ex.getMessage());
                }
            }
        } else {
            for (LaundryService s : fromDb) {
                names.add(normalizeKey(s.getName()));
            }
        }
        return names;
    }

    private Path resolveMasterPath(String fileName) {
        Path swashDir = Path.of(swashDataDir).toAbsolutePath().normalize();
        List<Path> candidates = new ArrayList<>();
        candidates.add(swashDir.getParent() == null ? Path.of(fileName) : swashDir.getParent().resolve(fileName));
        candidates.add(Path.of(fileName));
        candidates.add(Path.of("..", fileName));
        candidates.add(Path.of("..", "..", fileName));
        for (Path candidate : candidates) {
            if (Files.exists(candidate)) {
                return candidate;
            }
        }
        return null;
    }

    // ------------------------------------------------------------------
    // Indexing helpers
    // ------------------------------------------------------------------

    private Map<String, BookedLaundryRow> indexBooked(List<BookedLaundryRow> rows) {
        Map<String, BookedLaundryRow> map = new LinkedHashMap<>();
        for (BookedLaundryRow row : rows) {
            String no = trim(row.orderNo());
            if (no != null && !no.isBlank()) {
                map.put(no, row);
            }
        }
        return map;
    }

    private Map<String, InvoiceRow> indexInvoices(List<InvoiceRow> rows) {
        Map<String, InvoiceRow> map = new LinkedHashMap<>();
        for (InvoiceRow row : rows) {
            String no = trim(row.invoiceNo());
            if (no != null && !no.isBlank()) {
                map.putIfAbsent(no, row);
            }
        }
        return map;
    }

    private Map<String, List<OrderDetailRow>> indexDetails(List<OrderDetailRow> rows) {
        Map<String, List<OrderDetailRow>> map = new LinkedHashMap<>();
        for (OrderDetailRow row : rows) {
            String no = trim(row.orderNo());
            if (no != null && !no.isBlank()) {
                map.computeIfAbsent(no, k -> new ArrayList<>()).add(row);
            }
        }
        return map;
    }

    private BookedLaundryRow fromInvoice(InvoiceRow invoice) {
        if (invoice == null) {
            return null;
        }
        return new BookedLaundryRow(invoice.customerName(), invoice.mobile(), invoice.address(),
                invoice.invoiceDate(), invoice.deliveryDate(), invoice.createdDateTime(), invoice.invoiceNo(),
                invoice.additionalCharges(), invoice.totalDiscount(), invoice.totalAmount(), null, null, null);
    }

    private SwashSourceFiles loadSourceFiles(Path dir) {
        if (!Files.isDirectory(dir)) {
            throw new BadRequestException("Swash data directory not found: " + dir.toAbsolutePath());
        }
        SwashSourceFiles files = new SwashSourceFiles();
        try (var stream = Files.list(dir)) {
            List<Path> all = stream.filter(Files::isRegularFile).toList();
            files.booked = readFirst(all, "BookedLaundry", "bookedlaundry", "Booked Laundry");
            files.bookedName = fileName(files.booked, all, "BookedLaundry", "bookedlaundry", "Booked Laundry");
            files.invoices = readFirst(all, "Invoices", "invoices", "Invoice");
            files.invoicesName = fileName(files.invoices, all, "Invoices", "invoices", "Invoice");
            files.orderDetails = readFirst(all, "OrderDetails", "orderdetails", "OrderDetail", "orderdetail");
            files.orderDetailsName = fileName(files.orderDetails, all, "OrderDetails", "orderdetails", "OrderDetail", "orderdetail");
            files.expenses = readFirst(all, "Expenses", "expenses", "Expense");
            files.expensesName = fileName(files.expenses, all, "Expenses", "expenses", "Expense");
            files.payments = readFirst(all, "Payments", "payments", "Payment", "payment");
            files.paymentsName = fileName(files.payments, all, "Payments", "payments", "Payment", "payment");
        } catch (IOException ex) {
            throw new BadRequestException("Could not list Swash data directory: " + ex.getMessage());
        }
        return files;
    }

    private byte[] readFirst(List<Path> files, String... prefixes) {
        return pick(files, prefixes).map(p -> {
            try {
                return Files.readAllBytes(p);
            } catch (IOException ex) {
                throw new BadRequestException("Could not read " + p + ": " + ex.getMessage());
            }
        }).orElse(null);
    }

    private String fileName(byte[] data, List<Path> files, String... prefixes) {
        if (data == null) {
            return null;
        }
        return pick(files, prefixes).map(p -> p.getFileName().toString()).orElse("provided");
    }

    private java.util.Optional<Path> pick(List<Path> files, String... prefixes) {
        return files.stream()
                .filter(p -> {
                    String normalized = p.getFileName().toString().toLowerCase(Locale.ROOT).replaceAll("[^a-z]", "");
                    String candidate = String.join("", prefixes).toLowerCase(Locale.ROOT).replaceAll("[^a-z]", "");
                    return Arrays.stream(prefixes).map(prefix -> prefix.toLowerCase(Locale.ROOT).replaceAll("[^a-z]", ""))
                            .anyMatch(normalized::startsWith);
                })
                .findFirst();
    }

    // ------------------------------------------------------------------
    // small helpers
    // ------------------------------------------------------------------

    private static String trim(String value) {
        return value == null ? null : value.trim();
    }

    private static String normalizeKey(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
    }

    private static String baseProductName(String productName, String service) {
        String s = trim(productName);
        if (s == null) {
            return null;
        }
        if (service != null) {
            String suffix = "(" + service.trim() + ")";
            if (s.endsWith(suffix)) {
                s = s.substring(0, s.length() - suffix.length());
            }
        }
        return s.trim();
    }

    private static String categoryFromName(String productName) {
        if (productName == null) {
            return null;
        }
        Matcher m = BRACKET_CATEGORY.matcher(productName.trim());
        return m.find() ? m.group(1) : null;
    }

    private static BigDecimal value(BookedLaundryRow row, Function<BookedLaundryRow, BigDecimal> getter) {
        return row == null ? null : getter.apply(row);
    }

    private static BigDecimal value(InvoiceRow row, Function<InvoiceRow, BigDecimal> getter) {
        return row == null ? null : getter.apply(row);
    }

    private static BigDecimal firstNonNull(BigDecimal... values) {
        for (BigDecimal v : values) {
            if (v != null) {
                return v;
            }
        }
        return null;
    }

    private long nextInvoiceCounter(long maxHistorical) {
        AppSettings settings = settingsService.getSettings();
        return Math.max(settings.getInvoiceCounter(), maxHistorical);
    }

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

    // ------------------------------------------------------------------
    // internal types
    // ------------------------------------------------------------------

    private static class SwashSourceFiles {
        private byte[] booked;
        private String bookedName;
        private byte[] invoices;
        private String invoicesName;
        private byte[] orderDetails;
        private String orderDetailsName;
        private byte[] expenses;
        private String expensesName;
        private byte[] payments;
        private String paymentsName;
    }

    private static class Workload {
        private final List<SwashParseIssue> issues = new ArrayList<>();
        private final List<BookedLaundryRow> bookedRows = new ArrayList<>();
        private final List<InvoiceRow> invoiceRows = new ArrayList<>();
        private final List<OrderDetailRow> detailRows = new ArrayList<>();
        private final List<ExpenseRow> expenseRows = new ArrayList<>();
        private final List<PaymentReceivedRow> paymentRows = new ArrayList<>();
        private String bookedName;
        private String invoicesName;
        private String orderDetailsName;
        private String expensesName;
        private String paymentsName;

        private void assertReadable() {
            List<SwashParseIssue> fatal = issues.stream()
                    .filter(i -> "READ_ERROR".equals(i.getType()) || "MALFORMED".equals(i.getType())).toList();
            if (!fatal.isEmpty()) {
                throw new BadRequestException("Source files could not be read: " + fatal.get(0).getMessage());
            }
            if (bookedRows.isEmpty() && invoiceRows.isEmpty() && detailRows.isEmpty() && expenseRows.isEmpty()) {
                throw new BadRequestException("No source data provided for the migration.");
            }
        }
    }

    private static class OrderTarget {
        private final String orderNo;
        private final BookedLaundryRow booked;
        private final InvoiceRow invoice;
        private final List<OrderDetailRow> details;
        private String decision;
        private Customer customer;

        private OrderTarget(String orderNo, BookedLaundryRow booked, InvoiceRow invoice, List<OrderDetailRow> details) {
            this.orderNo = orderNo;
            this.booked = booked;
            this.invoice = invoice;
            this.details = details;
        }
    }

    private static class ExecutionContext {
        private int customersCreated;
        private int customersMatched;
        private int ordersCreated;
        private int ordersSkipped;
        private int orderItemsCreated;
        private int expensesCreated;
        private int expensesSkipped;
        private int paymentsCreated;
        private int paymentsSkipped;
        private int paymentsUnmatched;
        private int orphanDetailsSkipped;
        private long invoiceCounter;
        private final List<String> skippedOrders = new ArrayList<>();
        private final List<String> errors = new ArrayList<>();
    }

    private class ReconcileResult {
        private final Map<String, Product> masterProducts;
        private final Set<String> masterServiceNames;
        private Set<String> allOrderNumbers = new LinkedHashSet<>();
        private final Set<String> matched = new LinkedHashSet<>();
        private final Set<String> bookedOnly = new LinkedHashSet<>();
        private final Set<String> bookedOnlyInactive = new LinkedHashSet<>();
        private final Set<String> invoiceOnly = new LinkedHashSet<>();
        private final Set<String> detailOnly = new LinkedHashSet<>();
        private final Set<String> ordersWithDetails = new LinkedHashSet<>();
        private final List<SwashDryRunReport.LineIssue> invalidQuantities = new ArrayList<>();
        private final List<SwashDryRunReport.LineIssue> invalidPrices = new ArrayList<>();
        private final List<SwashDryRunReport.LineIssue> lineTotalMismatches = new ArrayList<>();
        private final List<SwashDryRunReport.TotalMismatch> invoiceTotalMismatches = new ArrayList<>();
        private final Map<String, Long> unmatched = new LinkedHashMap<>();
        private List<SwashDryRunReport.UnmatchedProduct> unmatchedProducts = List.of();
        private final Set<String> unknownServices = new LinkedHashSet<>();
        private final Set<String> unknownStatuses = new LinkedHashSet<>();
        private final List<String> duplicateInvoiceNumbers = new ArrayList<>();
        private final List<SwashDryRunReport.StatusMapping> statusMappings = new ArrayList<>();
        private final LinkedHashMap<String, CustomerGroup> customerGroups = new LinkedHashMap<>();
        private long missingPhones;
        private long invoiceNumberMin = Long.MAX_VALUE;
        private long invoiceNumberMax = Long.MIN_VALUE;

        private ReconcileResult(Map<String, Product> masterProducts, Set<String> masterServiceNames) {
            this.masterProducts = masterProducts;
            this.masterServiceNames = masterServiceNames;
        }

        private void indexCustomers(Workload w) {
            Map<String, String> phoneByName = new HashMap<>();
            LinkedHashMap<String, CustomerGroup> ordered = new LinkedHashMap<>();

            java.util.function.BiConsumer<CustomerGroup, CustomerOccurrence> add =
                    (group, occ) -> {
                        group.names.add(normalizeKey(occ.name()));
                        group.rawPhones.add(occ.rawPhone() == null ? "" : occ.rawPhone());
                        group.records++;
                    };

            for (BookedLaundryRow row : w.bookedRows) {
                String normName = normalizeKey(row.customerName());
                String phone = trim(row.mobile());
                String normPhone = phone == null ? null : PhoneNumberUtil.toE164(phone, defaultCountry);
                if (normPhone != null) {
                    CustomerGroup group = ordered.computeIfAbsent("phone:" + normPhone, k -> new CustomerGroup(normPhone));
                    add.accept(group, new CustomerOccurrence(normName, phone));
                    phoneByName.putIfAbsent(normName, normPhone);
                } else {
                    CustomerGroup group = ordered.computeIfAbsent("name:" + normName, k -> new CustomerGroup(null));
                    add.accept(group, new CustomerOccurrence(normName, phone));
                }
            }
            for (InvoiceRow row : w.invoiceRows) {
                String normName = normalizeKey(row.customerName());
                String phone = trim(row.mobile());
                String normPhone = phone == null ? null : PhoneNumberUtil.toE164(phone, defaultCountry);
                if (normPhone != null) {
                    CustomerGroup group = ordered.computeIfAbsent("phone:" + normPhone, k -> new CustomerGroup(normPhone));
                    add.accept(group, new CustomerOccurrence(normName, phone));
                    phoneByName.putIfAbsent(normName, normPhone);
                } else {
                    CustomerGroup group = ordered.computeIfAbsent("name:" + normName, k -> new CustomerGroup(null));
                    add.accept(group, new CustomerOccurrence(normName, phone));
                }
            }
            for (OrderDetailRow row : w.detailRows) {
                String normName = normalizeKey(row.customerName());
                String phone = phoneByName.get(normName);
                String key = phone != null ? "phone:" + phone : "name:" + normName;
                CustomerGroup group = ordered.computeIfAbsent(key, k -> new CustomerGroup(phone));
                add.accept(group, new CustomerOccurrence(normName, null));
            }

            // merge name-only groups into a phone group carrying the same name
            List<String> nameOnlyKeys = ordered.keySet().stream().filter(k -> k.startsWith("name:")).toList();
            for (String key : nameOnlyKeys) {
                CustomerGroup nameGroup = ordered.get(key);
                String name = normalizeKey(nameGroup.names.iterator().next());
                if (phoneByName.containsKey(name)) {
                    CustomerGroup phoneGroup = ordered.get("phone:" + phoneByName.get(name));
                    if (phoneGroup != null) {
                        nameGroup.rawPhones.forEach(ph -> phoneGroup.records++);
                        phoneGroup.names.add(name);
                        ordered.remove(key);
                    }
                }
            }

            for (CustomerGroup group : ordered.values()) {
                long withPhone = group.rawPhones.stream().filter(p -> !p.isBlank()).count();
                if (withPhone == 0) {
                    missingPhones++;
                }
            }
            this.customerGroups.clear();
            this.customerGroups.putAll(ordered);
        }

        private record CustomerOccurrence(String name, String rawPhone) {
        }

        private static class CustomerGroup {
            private final String normalizedPhone;
            private final Set<String> names = new LinkedHashSet<>();
            private final Set<String> rawPhones = new LinkedHashSet<>();
            private long records;

            private CustomerGroup(String normalizedPhone) {
                this.normalizedPhone = normalizedPhone;
            }

            private SwashDryRunReport.CustomerGroup toReport() {
                return SwashDryRunReport.CustomerGroup.builder()
                        .normalizedPhone(normalizedPhone)
                        .displayPhone(rawPhones.stream().filter(p -> !p.isBlank()).findFirst().orElse(null))
                        .names(new ArrayList<>(names))
                        .sourceRecords(records)
                        .build();
            }
        }
    }
}