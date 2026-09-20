package com.faeiq.ClothNCare.common.importexport;

import com.faeiq.ClothNCare.LaundryService.entity.LaundryService;
import com.faeiq.ClothNCare.LaundryService.repository.LaundryServiceRepository;
import com.faeiq.ClothNCare.LaundryService.service.LaundryServiceService;
import com.faeiq.ClothNCare.charge.entity.ChargeType;
import com.faeiq.ClothNCare.charge.repository.ChargeTypeRepository;
import com.faeiq.ClothNCare.common.exception.BadRequestException;
import com.faeiq.ClothNCare.customer.entity.Customer;
import com.faeiq.ClothNCare.customer.repository.CustomerRepository;
import com.faeiq.ClothNCare.expense.entity.Expense;
import com.faeiq.ClothNCare.expense.repository.ExpenseRepository;
import com.faeiq.ClothNCare.expensehead.entity.ExpenseHead;
import com.faeiq.ClothNCare.expensehead.repository.ExpenseHeadRepository;
import com.faeiq.ClothNCare.orders.entity.Orders;
import com.faeiq.ClothNCare.orders.entity.OrdersItems;
import com.faeiq.ClothNCare.orders.entity.Payment;
import com.faeiq.ClothNCare.orders.entity.PaymentMethod;
import com.faeiq.ClothNCare.orders.entity.Status;
import com.faeiq.ClothNCare.orders.repository.OrdersRepository;
import com.faeiq.ClothNCare.orders.repository.PaymentRepository;
import com.faeiq.ClothNCare.pricelist.dto.PriceListEntryDTO;
import com.faeiq.ClothNCare.pricelist.entity.PriceList;
import com.faeiq.ClothNCare.pricelist.entity.PriceListEntry;
import com.faeiq.ClothNCare.pricelist.repository.PriceListEntryRepository;
import com.faeiq.ClothNCare.pricelist.repository.PriceListRepository;
import com.faeiq.ClothNCare.product.entity.Product;
import com.faeiq.ClothNCare.product.repository.ProductRepository;
import com.faeiq.ClothNCare.settings.service.SettingsService;
import com.faeiq.ClothNCare.storage.entity.StorageBag;
import com.faeiq.ClothNCare.storage.entity.StorageRack;
import com.faeiq.ClothNCare.storage.repository.StorageBagRepository;
import com.faeiq.ClothNCare.storage.repository.StorageRackRepository;
import com.faeiq.ClothNCare.user.entity.Role;
import com.faeiq.ClothNCare.user.entity.Users;
import com.faeiq.ClothNCare.user.repository.UsersRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class DataImportExportService {

    private static final BigDecimal ZERO = BigDecimal.ZERO;
    private static final DateTimeFormatter DATE_ISO = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter DATETIME_ISO = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final CustomerRepository customerRepository;
    private final PriceListRepository priceListRepository;
    private final PriceListEntryRepository priceListEntryRepository;
    private final ProductRepository productRepository;
    private final LaundryServiceRepository laundryServiceRepository;
    private final OrdersRepository ordersRepository;
    private final PaymentRepository paymentRepository;
    private final UsersRepository usersRepository;
    private final ExpenseRepository expenseRepository;
    private final ExpenseHeadRepository expenseHeadRepository;
    private final StorageBagRepository storageBagRepository;
    private final StorageRackRepository storageRackRepository;
    private final ChargeTypeRepository chargeTypeRepository;
    private final SettingsService settingsService;
    private final LaundryServiceService laundryServiceService;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(12);

    public byte[] export(String resource, String format) {
        DataTable table = exportTable(resource);
        return serialize(table, format);
    }

    public byte[] template(String resource, String format) {
        DataTable table = exportTable(resource);
        return serialize(new DataTable(table.headers(), List.of()), format);
    }

    @Transactional
    public ImportResult importData(String resource, byte[] data, String format) {
        DataTable table = ExcelUtil.read(data, format);
        ImportResult result = new ImportResult();
        switch (resource) {
            case "customers" -> importCustomers(table, result);
            case "price-lists" -> importPriceLists(table, result);
            case "products" -> importProducts(table, result);
            case "services" -> importServices(table, result);
            case "orders" -> importOrders(table, result);
            case "payments" -> importPayments(table, result);
            case "expenses" -> importExpenses(table, result);
            case "expense-heads" -> importExpenseHeads(table, result);
            case "bags" -> importBags(table, result);
            case "racks" -> importRacks(table, result);
            case "charge-types", "additional-charges" -> importChargeTypes(table, result);
            case "users" -> importUsers(table, result);
            case "invoices" -> throw new BadRequestException(
                    "Invoices are generated from orders; use the Orders import instead.");
            default -> throw new BadRequestException("Unknown data resource: " + resource);
        }
        return result;
    }

    private DataTable exportTable(String resource) {
        return switch (resource) {
            case "customers" -> customersTable();
            case "price-lists" -> priceListsTable();
            case "products" -> productsTable();
            case "services" -> servicesTable();
            case "orders", "invoices" -> ordersTable();
            case "workshop", "workshop-history", "challan" -> workshopTable();
            case "payments" -> paymentsTable();
            case "expenses" -> expensesTable();
            case "expense-heads" -> expenseHeadsTable();
            case "bags" -> bagsTable();
            case "racks" -> racksTable();
            case "charge-types", "additional-charges" -> chargeTypesTable();
            case "users" -> usersTable();
            default -> throw new BadRequestException("Unknown data resource: " + resource);
        };
    }

    private byte[] serialize(DataTable table, String format) {
        boolean csv = format != null && format.toLowerCase().contains("csv");
        if (csv) {
            return ExcelUtil.toCsv(table.headers(), table.rows());
        }
        return ExcelUtil.toXlsx("Data", table.headers(), table.rows());
    }

    // ------------------------------------------------------------------
    // Exporters
    // ------------------------------------------------------------------

    private DataTable customersTable() {
        List<String> headers = List.of("Name", "Phone", "Email", "Address", "Notes");
        List<List<String>> rows = new ArrayList<>();
        customerRepository.findAll().stream()
                .sorted(Comparator.comparing(Customer::getName, Comparator.nullsLast(String::compareTo)))
                .forEach(c -> rows.add(List.of(
                        nullToEmpty(c.getName()),
                        nullToEmpty(c.getPhone()),
                        nullToEmpty(c.getEmail()),
                        nullToEmpty(c.getAddress()),
                        nullToEmpty(c.getNotes()))));
        return new DataTable(headers, rows);
    }

    private DataTable priceListsTable() {
        List<String> headers = List.of("Price List Name", "Description", "Item Type", "Item Name", "Price");
        List<List<String>> rows = new ArrayList<>();
        priceListRepository.findAllByOrderByCreatedAtDesc().forEach(pl -> priceListEntryRepository
                .findAllByPriceListIdOrderByItemNameAsc(pl.getId())
                .forEach(entry -> rows.add(List.of(
                        nullToEmpty(pl.getName()),
                        nullToEmpty(pl.getDescription()),
                        entry.getItemType().name(),
                        nullToEmpty(entry.getItemName()),
                        fmt(entry.getPrice())))));
        return new DataTable(headers, rows);
    }

    private DataTable productsTable() {
        List<String> headers = List.of("Name", "Service", "Category", "Priority", "Unit", "Price", "Active");
        List<List<String>> rows = new ArrayList<>();
        productRepository.findAllByOrderByNameAsc().forEach(p -> rows.add(List.of(
                nullToEmpty(p.getName()),
                nullToEmpty(p.getService()),
                nullToEmpty(p.getCategory()),
                String.valueOf(p.getPriority()),
                nullToEmpty(p.getUnit()),
                fmt(p.getPrice()),
                p.isActive() ? "TRUE" : "FALSE")));
        return new DataTable(headers, rows);
    }

    private DataTable servicesTable() {
        List<String> headers = List.of("Name", "Product Type", "Price", "Active");
        List<List<String>> rows = new ArrayList<>();
        laundryServiceRepository.findAll().stream()
                .sorted(Comparator.comparing(LaundryService::getName, Comparator.nullsLast(String::compareTo)))
                .forEach(s -> rows.add(List.of(
                        nullToEmpty(s.getName()),
                        nullToEmpty(s.getProductType()),
                        fmt(s.getPrice()),
                        s.isActive() ? "TRUE" : "FALSE")));
        return new DataTable(headers, rows);
    }

    private DataTable ordersTable() {
        List<String> headers = List.of(
                "Invoice No", "Status", "Customer Name", "Customer Phone",
                "Discount", "Paid Amount", "Expected Delivery", "Created At",
                "Service Type", "Product Type", "Quantity", "Unit Price");
        List<List<String>> rows = new ArrayList<>();
        ordersRepository.findAll().stream()
                .sorted(Comparator.comparing(Orders::getCreated_at, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .forEach(order -> {
                    String invoice = nullToEmpty(order.getInvoice_number());
                    String status = order.getStatus() == null ? "" : order.getStatus().name();
                    String customerName = order.getCustomer() != null ? nullToEmpty(order.getCustomer().getName()) : "";
                    String customerPhone = order.getCustomer() != null ? nullToEmpty(order.getCustomer().getPhone()) : "";
                    String discount = fmt(order.getDiscount());
                    String paid = fmt(order.getPaid_amount());
                    String expected = order.getExpected_delivery_date() == null ? "" : order.getExpected_delivery_date().format(DATE_ISO);
                    String created = order.getCreated_at() == null ? "" : order.getCreated_at().format(DATETIME_ISO);
                    if (order.getItems() == null || order.getItems().isEmpty()) {
                        rows.add(List.of(invoice, status, customerName, customerPhone, discount, paid, expected, created,
                                "", "", "", ""));
                    } else {
                        order.getItems().forEach(item -> rows.add(List.of(
                                invoice, status, customerName, customerPhone, discount, paid, expected, created,
                                nullToEmpty(item.getService_type()),
                                nullToEmpty(item.getProduct_type()),
                                fmtQty(item.getQuantity()),
                                fmt(item.getPrice()))));
                    }
                });
        return new DataTable(headers, rows);
    }

    // private DataTable workshopTable() {
    //     List<String> headers = List.of(
    //             "Sr No", "Invoice No", "Customer Name", "Invoice Date", "Delivery Date",
    //             "Product", "Service", "Qty", "Item Amount", "Discount", "Tax", "Total Amount", "Status");
    //     List<List<String>> rows = new ArrayList<>();
    //     List<Orders> orders = ordersRepository.findAll().stream()
    //             .filter(o -> o.getStatus() != null && o.getStatus() != Status.CANCELLED)
    //             .sorted(Comparator.comparing(Orders::getCreated_at, Comparator.nullsLast(Comparator.naturalOrder())))
    //             .toList();
    //     int srNo = 0;
    //     BigDecimal grandTotal = BigDecimal.ZERO;
    //     for (Orders order : orders) {
    //         if (order.getItems() == null || order.getItems().isEmpty()) {
    //             continue;
    //         }
    //         int itemCount = order.getItems().size();
    //         for (int i = 0; i < itemCount; i++) {
    //             OrdersItems item = order.getItems().get(i);
    //             boolean lastRow = i == itemCount - 1;
    //             BigDecimal invoiceTotal = null;
    //             if (lastRow) {
    //                 invoiceTotal = order.getTotal_price() == null ? BigDecimal.ZERO : order.getTotal_price();
    //                 grandTotal = grandTotal.add(invoiceTotal);
    //             }
    //             String product = item.getProduct_name() != null && !item.getProduct_name().isEmpty()
    //                     ? item.getProduct_name()
    //                     : item.getProduct_type() == null ? "" : item.getProduct_type();
    //             rows.add(List.of(
    //                     String.valueOf(++srNo),
    //                     nullToEmpty(order.getInvoice_number()),
    //                     order.getCustomer() != null ? nullToEmpty(order.getCustomer().getName()) : "",
    //                     order.getCreated_at() == null ? "" : order.getCreated_at().format(DATETIME_ISO),
    //                     order.getExpected_delivery_date() == null ? "" : order.getExpected_delivery_date().format(DATE_ISO),
    //                     product,
    //                     nullToEmpty(item.getService_type()),
    //                     fmt(item.getQuantity()) + (item.getUom() == null || item.getUom().isEmpty() ? "" : " " + item.getUom()),
    //                     fmt(item.getPrice() == null ? null : item.getPrice().multiply(item.getQuantity() == null ? BigDecimal.ONE : item.getQuantity())),
    //                     fmt(order.getDiscount()),
    //                     fmt(order.getTax_amount()),
    //                     invoiceTotal == null ? "" : fmt(invoiceTotal),
    //                     order.getStatus() == null ? "" : order.getStatus().name()));
    //         }
    //     }
    //     rows.add(List.of("", "", "", "", "", "Grand Total", "", "", "", "", "", fmt(grandTotal), ""));
    //     return new DataTable(headers, rows);
    // }

    // private DataTable paymentsTable() {
    //     List<String> headers = List.of("Id", "Invoice No", "Amount", "Method", "Paid At", "Recorded By Email");
    //     List<List<String>> rows = new ArrayList<>();
    //     paymentRepository.findAll().stream()
    //             .sorted(Comparator.comparing(Payment::getPaidAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
    //             .forEach(p -> rows.add(List.of(
    //                     nullToEmpty(p.getId()),
    //                     p.getOrder() != null ? nullToEmpty(p.getOrder().getInvoice_number()) : "",
    //                     fmt(p.getAmount()),
    //                     p.getMethod() == null ? "" : p.getMethod().name(),
    //                     p.getPaidAt() == null ? "" : p.getPaidAt().format(DATETIME_ISO),
    //                     p.getRecordedBy() != null ? nullToEmpty(p.getRecordedBy().getEmail()) : "")));
    //     return new DataTable(headers, rows);
    // }

   private DataTable workshopTable() {
    List<String> headers = List.of(
            "Sr No", "Invoice No", "Customer Name", "Customer Number",
            "Invoice Date", "Delivery Date", "Product", "Service",
            "Qty", "Item Amount", "Discount", "Tax", "Total Amount", "Status"
    );

    List<List<String>> rows = new ArrayList<>();

    List<Orders> orders = ordersRepository.findAll().stream()
            .filter(o -> o.getStatus() != null && o.getStatus() != Status.CANCELLED)
            .sorted(
                    Comparator.<Orders, Boolean>comparing(
                            o -> isNewInvoiceFormat(o.getInvoice_number())
                    ).reversed()
                    .thenComparing(
                            o -> extractInvoiceNumber(o.getInvoice_number()),
                            Comparator.reverseOrder()
                    )
            )
            .toList();

    int srNo = 0;
    BigDecimal grandTotal = BigDecimal.ZERO;

    for (Orders order : orders) {
        if (order.getItems() == null || order.getItems().isEmpty()) {
            continue;
        }

        int itemCount = order.getItems().size();

        for (int i = 0; i < itemCount; i++) {
            OrdersItems item = order.getItems().get(i);
            boolean lastRow = i == itemCount - 1;

            BigDecimal invoiceTotal = null;

            if (lastRow) {
                invoiceTotal = order.getTotal_price() == null
                        ? BigDecimal.ZERO
                        : order.getTotal_price();

                grandTotal = grandTotal.add(invoiceTotal);
            }

            String product = item.getProduct_name() != null
                    && !item.getProduct_name().isEmpty()
                    ? item.getProduct_name()
                    : item.getProduct_type() == null
                            ? ""
                            : item.getProduct_type();

            String customerNumber = order.getCustomer() != null
                    ? nullToEmpty(order.getCustomer().getPhone())
                    : "";

            rows.add(List.of(
                    String.valueOf(++srNo),
                    nullToEmpty(order.getInvoice_number()),
                    order.getCustomer() != null
                            ? nullToEmpty(order.getCustomer().getName())
                            : "",
                    customerNumber,
                    order.getCreated_at() == null
                            ? ""
                            : order.getCreated_at().format(DATETIME_ISO),
                    order.getExpected_delivery_date() == null
                            ? ""
                            : order.getExpected_delivery_date().format(DATE_ISO),
                    product,
                    nullToEmpty(item.getService_type()),
                    fmt(item.getQuantity())
                            + (item.getUom() == null || item.getUom().isEmpty()
                                    ? ""
                                    : " " + item.getUom()),
                    fmt(item.getPrice() == null
                            ? null
                            : item.getPrice().multiply(
                                    item.getQuantity() == null
                                            ? BigDecimal.ONE
                                            : item.getQuantity())),
                    fmt(order.getDiscount()),
                    fmt(order.getTax_amount()),
                    invoiceTotal == null ? "" : fmt(invoiceTotal),
                    order.getStatus() == null
                            ? ""
                            : order.getStatus().name()
            ));
        }
    }

    // 14 columns, matching the 14 headers
    rows.add(List.of(
            "", "", "", "", "", "Grand Total",
            "", "", "", "", "", "", fmt(grandTotal), ""
    ));

    return new DataTable(headers, rows);
}

private boolean isNewInvoiceFormat(String invoiceNumber) {
    return invoiceNumber != null && invoiceNumber.startsWith("INV-");
}

private Long extractInvoiceNumber(String invoiceNumber) {
    if (invoiceNumber == null || invoiceNumber.isBlank()) {
        return 0L;
    }

    if (invoiceNumber.startsWith("INV-")) {
        return Long.parseLong(
                invoiceNumber.substring(invoiceNumber.lastIndexOf('-') + 1)
        );
    }

    return Long.parseLong(invoiceNumber);
}

    private DataTable paymentsTable() {
        List<String> headers = List.of("Id", "Invoice No", "Amount", "Method", "Paid At", "Recorded By Email");
        List<List<String>> rows = new ArrayList<>();
        paymentRepository.findAll().stream()
                .sorted(Comparator.comparing(Payment::getPaidAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .forEach(p -> rows.add(List.of(
                        nullToEmpty(p.getId()),
                        p.getOrder() != null ? nullToEmpty(p.getOrder().getInvoice_number()) : "",
                        fmt(p.getAmount()),
                        p.getMethod() == null ? "" : p.getMethod().name(),
                        p.getPaidAt() == null ? "" : p.getPaidAt().format(DATETIME_ISO),
                        p.getRecordedBy() != null ? nullToEmpty(p.getRecordedBy().getEmail()) : "")));
        return new DataTable(headers, rows);
    }

    private DataTable expensesTable() {
        List<String> headers = List.of("Id", "Category", "Expense Head", "Description", "Amount", "Expense Date", "Created At");
        List<List<String>> rows = new ArrayList<>();
        expenseRepository.findAll().stream()
                .sorted(Comparator.comparing(Expense::getExpenseDate, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .forEach(e -> {
                    String headName = "";
                    if (e.getExpenseHeadId() != null) {
                        headName = expenseHeadRepository.findById(e.getExpenseHeadId())
                                .map(ExpenseHead::getName).orElse("");
                    }
                    rows.add(List.of(
                            nullToEmpty(e.getId()),
                            nullToEmpty(e.getCategory()),
                            headName,
                            nullToEmpty(e.getDescription()),
                            fmt(e.getAmount()),
                            e.getExpenseDate() == null ? "" : e.getExpenseDate().format(DATE_ISO),
                            e.getCreatedAt() == null ? "" : e.getCreatedAt().format(DATETIME_ISO)));
                });
        return new DataTable(headers, rows);
    }

    private DataTable expenseHeadsTable() {
        List<String> headers = List.of("Name", "Description", "Active");
        List<List<String>> rows = new ArrayList<>();
        expenseHeadRepository.findAllByOrderByNameAsc().forEach(h -> rows.add(List.of(
                nullToEmpty(h.getName()),
                nullToEmpty(h.getDescription()),
                h.isActive() ? "TRUE" : "FALSE")));
        return new DataTable(headers, rows);
    }

    private DataTable bagsTable() {
        List<String> headers = List.of("Bag Number", "Size", "Status", "Notes");
        List<List<String>> rows = new ArrayList<>();
        storageBagRepository.findAllByOrderByBagNumberAsc().forEach(b -> rows.add(List.of(
                nullToEmpty(b.getBagNumber()),
                nullToEmpty(b.getSize()),
                b.getStatus() == null ? "" : b.getStatus().name(),
                nullToEmpty(b.getNotes()))));
        return new DataTable(headers, rows);
    }

    private DataTable racksTable() {
        List<String> headers = List.of("Name", "Location", "Capacity", "Notes");
        List<List<String>> rows = new ArrayList<>();
        storageRackRepository.findAllByOrderByNameAsc().forEach(r -> rows.add(List.of(
                nullToEmpty(r.getName()),
                nullToEmpty(r.getLocation()),
                String.valueOf(r.getCapacity()),
                nullToEmpty(r.getNotes()))));
        return new DataTable(headers, rows);
    }

    private DataTable chargeTypesTable() {
        List<String> headers = List.of("Name", "Calculation", "Default Amount", "Active");
        List<List<String>> rows = new ArrayList<>();
        chargeTypeRepository.findAllByOrderByNameAsc().forEach(c -> rows.add(List.of(
                nullToEmpty(c.getName()),
                c.getCalculation() == null ? "" : c.getCalculation().name(),
                fmt(c.getDefaultAmount()),
                c.isActive() ? "TRUE" : "FALSE")));
        return new DataTable(headers, rows);
    }

    private DataTable usersTable() {
        List<String> headers = List.of("Name", "Email", "Role");
        List<List<String>> rows = new ArrayList<>();
        usersRepository.findAll().stream()
                .sorted(Comparator.comparing(Users::getName, Comparator.nullsLast(String::compareTo)))
                .forEach(u -> rows.add(List.of(
                        nullToEmpty(u.getName()),
                        nullToEmpty(u.getEmail()),
                        u.getRole() == null ? "" : u.getRole().name())));
        return new DataTable(headers, rows);
    }

    // ------------------------------------------------------------------
    // Importers
    // ------------------------------------------------------------------

    private void importCustomers(DataTable t, ImportResult result) {
        Set<String> seen = new HashSet<>();
        for (Row row : rows(t)) {
            String name = row.val("Name");
            String phone = row.val("Phone");
            if (name.isEmpty() || phone.isEmpty()) {
                result.getErrors().add("Customer row skipped: Name and Phone are required");
                continue;
            }
            if (!seen.add(phone.trim().toLowerCase())) {
                result.setSkipped(result.getSkipped() + 1);
                continue;
            }
            try {
                Customer existing = customerRepository.findByPhone(phone);
                if (existing == null) {
                    Customer customer = new Customer();
                    customer.setName(name);
                    customer.setPhone(phone);
                    customer.setEmail(blankToNull(row.val("Email")));
                    customer.setAddress(blankToNull(row.val("Address")));
                    customer.setNotes(blankToNull(row.val("Notes")));
                    customer.setCreated_at(LocalDateTime.now());
                    customerRepository.save(customer);
                    result.setCreated(result.getCreated() + 1);
                } else {
                    existing.setName(name);
                    existing.setEmail(blankToNull(row.val("Email")));
                    existing.setAddress(blankToNull(row.val("Address")));
                    existing.setNotes(blankToNull(row.val("Notes")));
                    customerRepository.save(existing);
                    result.setUpdated(result.getUpdated() + 1);
                }
            } catch (RuntimeException e) {
                result.getErrors().add("Customer row failed: " + e.getMessage());
            }
        }
    }

    private void importPriceLists(DataTable t, ImportResult result) {
        boolean productFormat = t.headers().stream().anyMatch(h -> h.equalsIgnoreCase("Product Name"));
        boolean hasPriceListName = t.headers().stream().anyMatch(h -> h.equalsIgnoreCase("Price List Name"));
        Map<String, List<PriceListEntryDTO>> grouped = new LinkedHashMap<>();
        Map<String, String> descriptions = new LinkedHashMap<>();
        for (Row row : rows(t)) {
            String name = hasPriceListName ? row.val("Price List Name")
                    : (productFormat ? "Master Price List" : row.val("Price List Name"));
            if (name.isEmpty()) {
                result.getErrors().add("Price list row skipped: Price List Name is required");
                continue;
            }
            String itemName;
            String itemTypeRaw;
            String priceRaw = row.val("Price");
            if (productFormat) {
                String productName = row.val("Product Name");
                String service = row.val("Service");
                if (productName.isEmpty() || service.isEmpty() || priceRaw.isEmpty()) {
                    result.getErrors().add("Price list row skipped: Product Name, Service and Price are required");
                    continue;
                }
                itemName = productName + " - " + service;
                itemTypeRaw = "PRODUCT";
                applyCatalogPrice(productName, service, row.val("UOM"), priceRaw, result);
            } else {
                itemName = row.val("Item Name");
                itemTypeRaw = row.val("Item Type");
                if (itemName.isEmpty() || priceRaw.isEmpty() || itemTypeRaw.isEmpty()) {
                    result.getErrors().add("Price list row skipped: Item Type, Item Name and Price are required");
                    continue;
                }
            }
            PriceListEntry.EntryType itemType;
            try {
                itemType = PriceListEntry.EntryType.valueOf(itemTypeRaw.trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                result.getErrors().add("Price list row skipped: invalid Item Type '" + itemTypeRaw + "' (use SERVICE or PRODUCT)");
                continue;
            }
            BigDecimal price = decimal(priceRaw);
            if (price == null || price.compareTo(ZERO) < 0) {
                result.getErrors().add("Price list row skipped: invalid Price '" + priceRaw + "'");
                continue;
            }
            grouped.computeIfAbsent(name.trim(), k -> new ArrayList<>())
                    .add(new PriceListEntryDTO(itemType, itemName.trim(), price));
            if (!row.val("Description").isEmpty()) {
                descriptions.put(name.trim(), row.val("Description"));
            }
        }

        Set<String> seen = new HashSet<>();
        for (Map.Entry<String, List<PriceListEntryDTO>> e : grouped.entrySet()) {
            String name = e.getKey();
            List<PriceListEntryDTO> entries = e.getValue();
            if (!seen.add(name.toLowerCase())) {
                result.setSkipped(result.getSkipped() + 1);
                continue;
            }
            String description = descriptions.get(name);
            try {
                PriceList existing = priceListRepository.findByNameIgnoreCase(name).orElse(null);
                if (existing != null) {
                    if (description != null && !description.isBlank()) {
                        existing.setDescription(description);
                    }
                    priceListEntryRepository.deleteByPriceListId(existing.getId());
                    saveEntries(existing.getId(), entries);
                    priceListRepository.save(existing);
                    result.setUpdated(result.getUpdated() + 1);
                } else {
                    PriceList priceList = new PriceList();
                    priceList.setName(name);
                    priceList.setDescription(blankToNull(description));
                    priceList.setActive(false);
                    priceList.setCreatedAt(LocalDateTime.now());
                    priceList = priceListRepository.save(priceList);
                    saveEntries(priceList.getId(), entries);
                    result.setCreated(result.getCreated() + 1);
                }
            } catch (RuntimeException ex) {
                result.getErrors().add("Price list '" + name + "' failed: " + ex.getMessage());
            }
        }
    }

    private void saveEntries(String priceListId, List<PriceListEntryDTO> entries) {
        for (PriceListEntryDTO dto : entries) {
            PriceListEntry entry = new PriceListEntry();
            entry.setPriceListId(priceListId);
            entry.setItemType(dto.getItemType());
            entry.setItemName(dto.getItemName().trim());
            entry.setPrice(dto.getPrice());
            priceListEntryRepository.save(entry);
        }
    }

    private void applyCatalogPrice(String productName, String service, String uom, String priceRaw, ImportResult result) {
        BigDecimal price = decimal(priceRaw);
        if (price == null || price.compareTo(ZERO) < 0) {
            return;
        }
        String base = productName.trim();
        if (!service.isEmpty()) {
            int trailing = base.toLowerCase().lastIndexOf("(" + service.toLowerCase() + ")");
            if (trailing > 0) {
                base = (base.substring(0, trailing)).trim();
            }
        }
        String category = "";
        int open = base.indexOf('[');
        int close = base.indexOf(']');
        if (open > 0 && close > open) {
            category = base.substring(open + 1, close).trim();
            base = (base.substring(0, open) + " " + base.substring(close + 1)).trim();
        }
        Product product = productRepository
                .findByNameIgnoreCaseAndServiceIgnoreCaseAndCategoryIgnoreCase(base, service, category)
                .orElse(null);
        if (product == null && !category.isEmpty()) {
            product = productRepository
                    .findByNameIgnoreCaseAndServiceIgnoreCaseAndCategoryIgnoreCase(base, service, "")
                    .orElse(null);
        }
        if (product == null) {
            result.getErrors().add("Price list row skipped: no matching product for '" + productName + "' ("
                    + service + ", " + (category.isEmpty() ? "no category" : category) + ")");
            return;
        }
        product.setPrice(price);
        if (!uom.isEmpty()) {
            product.setUnit(uom.trim());
        }
        productRepository.save(product);
    }

    private void importProducts(DataTable t, ImportResult result) {
        Set<String> seen = new HashSet<>();
        boolean hasService = t.headers().stream().anyMatch(h -> h.equalsIgnoreCase("Service"));
        for (Row row : rows(t)) {
            String name = row.val("Name");
            if (name.isEmpty()) {
                result.getErrors().add("Product row skipped: Name is required");
                continue;
            }
            String service = hasService ? row.val("Service") : "";
            String category = row.val("Category").isEmpty() ? row.val("productsubcategory Name") : row.val("Category");
            String key = (name.trim() + "|" + service.trim() + "|" + category.trim()).toLowerCase();
            if (!seen.add(key)) {
                result.setSkipped(result.getSkipped() + 1);
                continue;
            }
            BigDecimal price = decimal(row.val("Price"));
            if (price == null) {
                price = ZERO;
            }
            if (price.compareTo(ZERO) < 0) {
                result.getErrors().add("Product row skipped: Price cannot be negative");
                continue;
            }
            try {
                Product existing = productRepository
                        .findByNameIgnoreCaseAndServiceIgnoreCaseAndCategoryIgnoreCase(name.trim(), service, category)
                        .orElse(null);
                if (existing == null && !service.isEmpty() && !category.isEmpty()) {
                    existing = productRepository
                            .findByNameIgnoreCaseAndServiceIgnoreCaseAndCategoryIgnoreCase(name.trim(), service, "")
                            .orElse(null);
                }
                if (existing == null) {
                    Product product = new Product();
                    product.setName(name.trim());
                    product.setService(service.isEmpty() ? null : service.trim());
                    product.setCategory(category.trim().isEmpty() ? null : category.trim());
                    product.setPriority(intValue(row.val("Priority"), 0));
                    product.setUnit(blankToNull(rowUnit(row)));
                    product.setPrice(price);
                    product.setActive(bool(row.val("Active"), true));
                    productRepository.save(product);
                    result.setCreated(result.getCreated() + 1);
                } else {
                    existing.setName(name.trim());
                    existing.setService(service.isEmpty() ? existing.getService() : service.trim());
                    existing.setCategory(category.trim().isEmpty() ? existing.getCategory() : category.trim());
                    existing.setPriority(intValue(row.val("Priority"), existing.getPriority()));
                    existing.setUnit(blankToNull(rowUnit(row)));
                    existing.setPrice(price);
                    existing.setActive(bool(row.val("Active"), existing.isActive()));
                    productRepository.save(existing);
                    result.setUpdated(result.getUpdated() + 1);
                }
            } catch (RuntimeException e) {
                result.getErrors().add("Product row failed: " + e.getMessage());
            }
        }
    }

    private String rowUnit(Row row) {
        String unit = row.val("Unit");
        return unit.isEmpty() ? row.val("UOM") : unit;
    }

    private void importServices(DataTable t, ImportResult result) {
        Set<String> seen = new HashSet<>();
        for (Row row : rows(t)) {
            String name = row.val("Name");
            String productType = row.val("Product Type");
            if (name.isEmpty() || productType.isEmpty()) {
                result.getErrors().add("Service row skipped: Name and Product Type are required");
                continue;
            }
            if (!seen.add((name.trim() + "|" + productType.trim()).toLowerCase())) {
                result.setSkipped(result.getSkipped() + 1);
                continue;
            }
            BigDecimal price = decimal(row.val("Price"));
            if (price == null || price.compareTo(ZERO) < 0) {
                result.getErrors().add("Service row skipped: invalid Price '" + row.val("Price") + "'");
                continue;
            }
            try {
                LaundryService existing = laundryServiceRepository
                        .findByNameAndProductType(name, productType).orElse(null);
                if (existing == null) {
                    LaundryService service = new LaundryService();
                    service.setName(name.trim());
                    service.setProductType(productType.trim());
                    service.setPrice(price);
                    service.setActive(bool(row.val("Active"), true));
                    laundryServiceRepository.save(service);
                    result.setCreated(result.getCreated() + 1);
                } else {
                    existing.setPrice(price);
                    existing.setActive(bool(row.val("Active"), true));
                    laundryServiceRepository.save(existing);
                    result.setUpdated(result.getUpdated() + 1);
                }
            } catch (RuntimeException e) {
                result.getErrors().add("Service row failed: " + e.getMessage());
            }
        }
    }

    private void importOrders(DataTable t, ImportResult result) {
        Map<String, List<Row>> groups = new LinkedHashMap<>();
        for (Row row : rows(t)) {
            String invoiceNo = row.val("Invoice No");
            if (invoiceNo.isEmpty()) {
                result.getErrors().add("Order row skipped: Invoice No is required");
                continue;
            }
            groups.computeIfAbsent(invoiceNo.trim(), k -> new ArrayList<>()).add(row);
        }

        Set<String> seen = new HashSet<>();
        for (Map.Entry<String, List<Row>> e : groups.entrySet()) {
            String invoiceNo = e.getKey();
            List<Row> group = e.getValue();
            if (!seen.add(invoiceNo.toLowerCase())) {
                result.setSkipped(result.getSkipped() + 1);
                continue;
            }
            if (ordersRepository.findByInvoice_number(invoiceNo).isPresent()) {
                result.setSkipped(result.getSkipped() + 1);
                continue;
            }
            Row first = group.get(0);
            try {
                String phone = first.val("Customer Phone");
                Customer customer = phone.isEmpty() ? null : customerRepository.findByPhone(phone);
                if (customer == null && !first.val("Customer Name").isEmpty()) {
                    customer = new Customer();
                    customer.setName(first.val("Customer Name"));
                    customer.setPhone(phone.isEmpty() ? null : phone);
                    customer.setCreated_at(LocalDateTime.now());
                    customer = customerRepository.save(customer);
                }
                if (customer == null) {
                    result.getErrors().add("Order " + invoiceNo + " skipped: no matching customer (provide Customer Phone)");
                    continue;
                }

                String statusRaw = first.val("Status");
                Status status;
                if (statusRaw.isEmpty()) {
                    status = Status.RECEIVED;
                } else {
                    try {
                        status = Status.valueOf(statusRaw.toUpperCase());
                    } catch (IllegalArgumentException ex) {
                        result.getErrors().add("Order " + invoiceNo + " skipped: invalid Status '" + statusRaw + "'");
                        continue;
                    }
                }

                BigDecimal discount = decimal(first.val("Discount"));
                if (discount == null || discount.compareTo(ZERO) < 0) {
                    discount = ZERO;
                }
                BigDecimal paid = decimal(first.val("Paid Amount"));
                if (paid == null || paid.compareTo(ZERO) < 0) {
                    paid = ZERO;
                }
                LocalDate expected = parseDate(first.val("Expected Delivery"));
                if (expected == null) {
                    expected = LocalDate.now();
                }

                List<OrdersItems> items = new ArrayList<>();
                BigDecimal subtotal = ZERO;
                boolean itemError = false;
                for (Row itemRow : group) {
                    String serviceType = itemRow.val("Service Type");
                    String productType = itemRow.val("Product Type");
                    if (serviceType.isEmpty() || productType.isEmpty()) {
                        result.getErrors().add("Order " + invoiceNo + " skipped: Service Type and Product Type are required");
                        itemError = true;
                        break;
                    }
                    int qty = intValue(itemRow.val("Quantity"), 0);
                    if (qty <= 0) {
                        result.getErrors().add("Order " + invoiceNo + " skipped: Quantity must be greater than zero");
                        itemError = true;
                        break;
                    }
                    BigDecimal unitPrice = decimal(itemRow.val("Unit Price"));
                    if (unitPrice == null || unitPrice.compareTo(ZERO) <= 0) {
                        try {
                            unitPrice = laundryServiceService.getPrice(serviceType, productType);
                        } catch (RuntimeException ignore) {
                            unitPrice = null;
                        }
                    }
                    if (unitPrice == null || unitPrice.compareTo(ZERO) <= 0) {
                        result.getErrors().add("Order " + invoiceNo + " skipped: no valid Unit Price for "
                                + serviceType + " - " + productType);
                        itemError = true;
                        break;
                    }
                    OrdersItems item = new OrdersItems();
                    item.setService_type(serviceType);
                    item.setProduct_type(productType);
                    item.setQuantity(BigDecimal.valueOf(qty));
                    item.setPrice(unitPrice);
                    items.add(item);
                    subtotal = subtotal.add(unitPrice.multiply(BigDecimal.valueOf(qty)));
                }
                if (itemError) {
                    continue;
                }

                if (discount.compareTo(subtotal) > 0) {
                    discount = subtotal;
                }
                BigDecimal taxRate = settingsService.getSettings().getTaxRate() == null
                        ? ZERO : settingsService.getSettings().getTaxRate();
                BigDecimal taxAmount = subtotal.subtract(discount)
                        .multiply(taxRate.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP))
                        .setScale(2, RoundingMode.HALF_UP);
                BigDecimal total = subtotal.subtract(discount).add(taxAmount)
                        .setScale(2, RoundingMode.HALF_UP);

                Orders order = new Orders();
                order.setCustomer(customer);
                order.setCreatedBy(currentUser());
                order.setStatus(status);
                order.setExpected_delivery_date(expected);
                order.setCreated_at(LocalDateTime.now());
                order.setDiscount(discount.setScale(2, RoundingMode.HALF_UP));
                order.setTax_amount(taxAmount);
                order.setPaid_amount(paid.setScale(2, RoundingMode.HALF_UP));
                order.setTotal_price(total);
                order.setInvoice_number(invoiceNo);
                order.setItems(items);
                for (OrdersItems item : items) {
                    item.setOrders(order);
                }
                ordersRepository.save(order);
                result.setCreated(result.getCreated() + 1);
            } catch (RuntimeException ex) {
                result.getErrors().add("Order " + invoiceNo + " failed: " + ex.getMessage());
            }
        }
    }

    private void importPayments(DataTable t, ImportResult result) {
        Set<String> seen = new HashSet<>();
        Set<String> affectedOrders = new LinkedHashSet<>();
        for (Row row : rows(t)) {
            String id = row.val("Id");
            if (!id.isEmpty()) {
                if (!seen.add(id)) {
                    result.setSkipped(result.getSkipped() + 1);
                    continue;
                }
                if (paymentRepository.existsById(id)) {
                    result.setSkipped(result.getSkipped() + 1);
                    continue;
                }
            }
            String invoiceNo = row.val("Invoice No");
            if (invoiceNo.isEmpty()) {
                result.getErrors().add("Payment row skipped: Invoice No is required");
                continue;
            }
            Orders order = ordersRepository.findByInvoice_number(invoiceNo).orElse(null);
            if (order == null) {
                result.getErrors().add("Payment row skipped: order " + invoiceNo + " not found (import Orders first)");
                continue;
            }
            BigDecimal amount = decimal(row.val("Amount"));
            if (amount == null || amount.compareTo(ZERO) <= 0) {
                result.getErrors().add("Payment row skipped: Amount must be greater than zero");
                continue;
            }
            PaymentMethod method = PaymentMethod.CASH;
            String methodRaw = row.val("Method");
            if (!methodRaw.isEmpty()) {
                try {
                    method = PaymentMethod.valueOf(methodRaw.toUpperCase());
                } catch (IllegalArgumentException ex) {
                    result.getErrors().add("Payment row skipped: invalid Method '" + methodRaw
                            + "' (use CASH, CARD, UPI, BANK_TRANSFER or OTHER)");
                    continue;
                }
            }
            LocalDateTime paidAt = parseDateTime(row.val("Paid At"));
            if (paidAt == null) {
                paidAt = LocalDateTime.now();
            }
            Users recordedBy = null;
            String email = row.val("Recorded By Email");
            if (!email.isEmpty()) {
                recordedBy = usersRepository.findByEmail(email);
            }
            try {
                Payment payment = new Payment();
                payment.setOrder(order);
                payment.setAmount(amount.setScale(2, RoundingMode.HALF_UP));
                payment.setMethod(method);
                payment.setPaidAt(paidAt);
                payment.setRecordedBy(recordedBy);
                paymentRepository.save(payment);
                affectedOrders.add(order.getId());
                result.setCreated(result.getCreated() + 1);
            } catch (RuntimeException ex) {
                result.getErrors().add("Payment row failed: " + ex.getMessage());
            }
        }

        for (String orderId : affectedOrders) {
            ordersRepository.findById(orderId).ifPresent(order -> {
                BigDecimal paid = order.getPayments() == null ? ZERO : order.getPayments().stream()
                        .map(Payment::getAmount)
                        .filter(Objects::nonNull)
                        .reduce(ZERO, BigDecimal::add)
                        .setScale(2, RoundingMode.HALF_UP);
                order.setPaid_amount(paid);
                ordersRepository.save(order);
            });
        }
    }

    private void importExpenses(DataTable t, ImportResult result) {
        for (Row row : rows(t)) {
            String id = row.val("Id");
            if (!id.isEmpty() && expenseRepository.existsById(id)) {
                result.setSkipped(result.getSkipped() + 1);
                continue;
            }
            String category = row.val("Category");
            String amountRaw = row.val("Amount");
            if (category.isEmpty() || amountRaw.isEmpty()) {
                result.getErrors().add("Expense row skipped: Category and Amount are required");
                continue;
            }
            BigDecimal amount = decimal(amountRaw);
            if (amount == null || amount.compareTo(ZERO) <= 0) {
                result.getErrors().add("Expense row skipped: Amount must be greater than zero");
                continue;
            }
            String headName = row.val("Expense Head");
            String headId = null;
            if (!headName.isEmpty()) {
                headId = expenseHeadRepository.findByNameIgnoreCase(headName)
                        .map(ExpenseHead::getId).orElse(null);
            }
            LocalDate expenseDate = parseDate(row.val("Expense Date"));
            if (expenseDate == null) {
                expenseDate = LocalDate.now();
            }
            try {
                Expense expense = new Expense();
                expense.setCategory(category.trim());
                expense.setExpenseHeadId(headId);
                expense.setDescription(blankToNull(row.val("Description")));
                expense.setAmount(amount);
                expense.setExpenseDate(expenseDate);
                expense.setCreatedAt(LocalDateTime.now());
                expense.setCreatedBy(currentUser());
                expenseRepository.save(expense);
                result.setCreated(result.getCreated() + 1);
            } catch (RuntimeException e) {
                result.getErrors().add("Expense row failed: " + e.getMessage());
            }
        }
    }

    private void importExpenseHeads(DataTable t, ImportResult result) {
        Set<String> seen = new HashSet<>();
        for (Row row : rows(t)) {
            String name = row.val("Name");
            if (name.isEmpty()) {
                result.getErrors().add("Expense head row skipped: Name is required");
                continue;
            }
            if (!seen.add(name.trim().toLowerCase())) {
                result.setSkipped(result.getSkipped() + 1);
                continue;
            }
            try {
                ExpenseHead existing = expenseHeadRepository.findByNameIgnoreCase(name).orElse(null);
                if (existing == null) {
                    ExpenseHead head = new ExpenseHead();
                    head.setName(name.trim());
                    head.setDescription(blankToNull(row.val("Description")));
                    head.setActive(bool(row.val("Active"), true));
                    expenseHeadRepository.save(head);
                    result.setCreated(result.getCreated() + 1);
                } else {
                    existing.setDescription(blankToNull(row.val("Description")));
                    existing.setActive(bool(row.val("Active"), true));
                    expenseHeadRepository.save(existing);
                    result.setUpdated(result.getUpdated() + 1);
                }
            } catch (RuntimeException e) {
                result.getErrors().add("Expense head row failed: " + e.getMessage());
            }
        }
    }

    private void importBags(DataTable t, ImportResult result) {
        Set<String> seen = new HashSet<>();
        for (Row row : rows(t)) {
            String bagNumber = row.val("Bag Number");
            if (bagNumber.isEmpty()) {
                result.getErrors().add("Bag row skipped: Bag Number is required");
                continue;
            }
            if (!seen.add(bagNumber.trim().toLowerCase())) {
                result.setSkipped(result.getSkipped() + 1);
                continue;
            }
            String statusRaw = row.val("Status");
            StorageBag.BagStatus status = StorageBag.BagStatus.AVAILABLE;
            if (!statusRaw.isEmpty()) {
                try {
                    status = StorageBag.BagStatus.valueOf(statusRaw.toUpperCase());
                } catch (IllegalArgumentException e) {
                    result.getErrors().add("Bag row skipped: invalid Status '" + statusRaw
                            + "' (use AVAILABLE, ASSIGNED or RETURNED)");
                    continue;
                }
            }
            try {
                StorageBag existing = storageBagRepository.findByBagNumberIgnoreCase(bagNumber).orElse(null);
                if (existing == null) {
                    StorageBag bag = new StorageBag();
                    bag.setBagNumber(bagNumber.trim());
                    bag.setSize(blankToNull(row.val("Size")));
                    bag.setStatus(status);
                    bag.setNotes(blankToNull(row.val("Notes")));
                    storageBagRepository.save(bag);
                    result.setCreated(result.getCreated() + 1);
                } else {
                    existing.setSize(blankToNull(row.val("Size")));
                    existing.setStatus(status);
                    existing.setNotes(blankToNull(row.val("Notes")));
                    storageBagRepository.save(existing);
                    result.setUpdated(result.getUpdated() + 1);
                }
            } catch (RuntimeException e) {
                result.getErrors().add("Bag row failed: " + e.getMessage());
            }
        }
    }

    private void importRacks(DataTable t, ImportResult result) {
        Set<String> seen = new HashSet<>();
        for (Row row : rows(t)) {
            String name = row.val("Name");
            if (name.isEmpty()) {
                result.getErrors().add("Rack row skipped: Name is required");
                continue;
            }
            if (!seen.add(name.trim().toLowerCase())) {
                result.setSkipped(result.getSkipped() + 1);
                continue;
            }
            int capacity = intValue(row.val("Capacity"), 0);
            if (capacity < 0) {
                result.getErrors().add("Rack row skipped: Capacity cannot be negative");
                continue;
            }
            try {
                StorageRack existing = storageRackRepository.findByNameIgnoreCase(name).orElse(null);
                if (existing == null) {
                    StorageRack rack = new StorageRack();
                    rack.setName(name.trim());
                    rack.setLocation(blankToNull(row.val("Location")));
                    rack.setCapacity(capacity);
                    rack.setNotes(blankToNull(row.val("Notes")));
                    storageRackRepository.save(rack);
                    result.setCreated(result.getCreated() + 1);
                } else {
                    existing.setLocation(blankToNull(row.val("Location")));
                    existing.setCapacity(capacity);
                    existing.setNotes(blankToNull(row.val("Notes")));
                    storageRackRepository.save(existing);
                    result.setUpdated(result.getUpdated() + 1);
                }
            } catch (RuntimeException e) {
                result.getErrors().add("Rack row failed: " + e.getMessage());
            }
        }
    }

    private void importChargeTypes(DataTable t, ImportResult result) {
        Set<String> seen = new HashSet<>();
        for (Row row : rows(t)) {
            String name = row.val("Name");
            if (name.isEmpty()) {
                result.getErrors().add("Charge type row skipped: Name is required");
                continue;
            }
            if (!seen.add(name.trim().toLowerCase())) {
                result.setSkipped(result.getSkipped() + 1);
                continue;
            }
            BigDecimal amount = decimal(row.val("Default Amount"));
            if (amount == null || amount.compareTo(ZERO) < 0) {
                result.getErrors().add("Charge type row skipped: invalid Default Amount");
                continue;
            }
            String calcRaw = row.val("Calculation");
            ChargeType.ChargeCalculation calculation = ChargeType.ChargeCalculation.FLAT;
            if (!calcRaw.isEmpty()) {
                try {
                    calculation = ChargeType.ChargeCalculation.valueOf(calcRaw.toUpperCase());
                } catch (IllegalArgumentException e) {
                    result.getErrors().add("Charge type row skipped: invalid Calculation '" + calcRaw
                            + "' (use FLAT or PERCENT)");
                    continue;
                }
            }
            try {
                ChargeType existing = chargeTypeRepository.findByNameIgnoreCase(name).orElse(null);
                if (existing == null) {
                    ChargeType chargeType = new ChargeType();
                    chargeType.setName(name.trim());
                    chargeType.setCalculation(calculation);
                    chargeType.setDefaultAmount(amount);
                    chargeType.setActive(bool(row.val("Active"), true));
                    chargeTypeRepository.save(chargeType);
                    result.setCreated(result.getCreated() + 1);
                } else {
                    existing.setCalculation(calculation);
                    existing.setDefaultAmount(amount);
                    existing.setActive(bool(row.val("Active"), true));
                    chargeTypeRepository.save(existing);
                    result.setUpdated(result.getUpdated() + 1);
                }
            } catch (RuntimeException e) {
                result.getErrors().add("Charge type row failed: " + e.getMessage());
            }
        }
    }

    private void importUsers(DataTable t, ImportResult result) {
        Set<String> seen = new HashSet<>();
        for (Row row : rows(t)) {
            String email = row.val("Email");
            if (email.isEmpty()) {
                result.getErrors().add("User row skipped: Email is required");
                continue;
            }
            if (!seen.add(email.trim().toLowerCase())) {
                result.setSkipped(result.getSkipped() + 1);
                continue;
            }
            String name = row.val("Name");
            String roleRaw = row.val("Role");
            Role role = null;
            if (!roleRaw.isEmpty()) {
                try {
                    role = Role.valueOf(roleRaw.trim().toUpperCase());
                } catch (IllegalArgumentException e) {
                    result.getErrors().add("User row skipped: invalid Role '" + roleRaw
                            + "' (use ADMIN, MANAGER or STAFF)");
                    continue;
                }
            }
            String password = row.val("Password");
            try {
                Users existing = usersRepository.findByEmail(email.trim());
                if (existing != null) {
                    if (!name.isEmpty()) {
                        existing.setName(name.trim());
                    }
                    if (role != null) {
                        existing.setRole(role);
                    }
                    if (!password.isEmpty()) {
                        if (password.length() < 6) {
                            result.getErrors().add("User row skipped: password must be at least 6 characters");
                            continue;
                        }
                        existing.setPassword(encoder.encode(password));
                    }
                    usersRepository.save(existing);
                    result.setUpdated(result.getUpdated() + 1);
                } else {
                    if (password.isEmpty() || password.length() < 6) {
                        result.getErrors().add("User row skipped: password is required and must be at least 6 characters");
                        continue;
                    }
                    Users user = new Users();
                    user.setName(name.isEmpty() ? null : name.trim());
                    user.setEmail(email.trim());
                    user.setPassword(encoder.encode(password));
                    user.setRole(role == null ? Role.STAFF : role);
                    usersRepository.save(user);
                    result.setCreated(result.getCreated() + 1);
                }
            } catch (RuntimeException e) {
                result.getErrors().add("User row failed: " + e.getMessage());
            }
        }
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private record Row(List<String> headers, List<String> values) {
        String val(String name) {
            for (int i = 0; i < headers.size(); i++) {
                if (headers.get(i).equalsIgnoreCase(name)) {
                    String v = i < values.size() ? values.get(i) : "";
                    return v == null ? "" : v.trim();
                }
            }
            return "";
        }
    }

    private List<Row> rows(DataTable t) {
        List<Row> result = new ArrayList<>();
        for (List<String> values : t.rows()) {
            result.add(new Row(t.headers(), values));
        }
        return result;
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String fmt(BigDecimal value) {
        return value == null ? "0.00" : value.setScale(2, RoundingMode.HALF_UP).toPlainString();
    }

    private String fmtQty(BigDecimal value) {
        if (value == null) {
            return "0";
        }
        BigDecimal stripped = value.stripTrailingZeros();
        return stripped.scale() <= 0 ? stripped.toBigInteger().toString()
                : value.setScale(2, RoundingMode.HALF_UP).toPlainString();
    }

    private BigDecimal decimal(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return new BigDecimal(value.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private int intValue(String value, int def) {
        if (value == null || value.isBlank()) {
            return def;
        }
        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException e) {
            return def;
        }
    }

    private boolean bool(String value, boolean def) {
        if (value == null || value.isBlank()) {
            return def;
        }
        return value.equalsIgnoreCase("true") || value.equalsIgnoreCase("yes")
                || value.equalsIgnoreCase("y") || value.equalsIgnoreCase("1");
    }

    private LocalDate parseDate(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String v = value.trim();
        List<String> patterns = List.of("yyyy-MM-dd", "dd/MM/yyyy", "dd-MM-yyyy", "dd MMM yyyy");
        for (String pattern : patterns) {
            try {
                return LocalDate.parse(v, DateTimeFormatter.ofPattern(pattern, Locale.ENGLISH));
            } catch (RuntimeException ignore) {
                // try next pattern
            }
        }
        try {
            return LocalDate.parse(v);
        } catch (RuntimeException ignore) {
            return null;
        }
    }

    private LocalDateTime parseDateTime(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String v = value.trim().replace('T', ' ');
        List<String> patterns = List.of(
                "yyyy-MM-dd HH:mm:ss", "yyyy-MM-dd HH:mm", "yyyy-MM-dd HH:mm:ss.SSS", "dd/MM/yyyy HH:mm");
        for (String pattern : patterns) {
            try {
                return LocalDateTime.parse(v, DateTimeFormatter.ofPattern(pattern, Locale.ENGLISH));
            } catch (RuntimeException ignore) {
                // try next pattern
            }
        }
        try {
            return LocalDateTime.parse(v);
        } catch (RuntimeException ignore) {
            return null;
        }
    }

    private Users currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null) {
            return null;
        }
        return usersRepository.findByEmail(auth.getName());
    }
}