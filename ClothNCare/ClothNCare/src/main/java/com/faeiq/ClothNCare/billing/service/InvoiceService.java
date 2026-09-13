package com.faeiq.ClothNCare.billing.service;

import com.faeiq.ClothNCare.billing.dto.InvoiceResponseDTO;
import com.faeiq.ClothNCare.common.exception.InvoiceGenerationException;
import com.faeiq.ClothNCare.common.exception.ResourceNotFoundException;
import com.faeiq.ClothNCare.orders.entity.Orders;
import com.faeiq.ClothNCare.orders.entity.OrdersItems;
import com.faeiq.ClothNCare.orders.repository.OrdersRepository;
import com.faeiq.ClothNCare.settings.entity.AppSettings;
import com.faeiq.ClothNCare.settings.service.SettingsService;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.FileOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class InvoiceService {

    private static final String INVOICE_DIR = "invoices/";
    private static final String INVOICE_URL_PREFIX = "/invoices/";

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd MMM yyyy");
    private static final DateTimeFormatter DATE_TIME_FMT = DateTimeFormatter.ofPattern("dd MMM yyyy hh:mm a");

    // 80mm thermal receipt (227pt wide), tall page so the whole bill flows onto one sheet
    private static final Rectangle RECEIPT_PAGE = new Rectangle(227f, 3600f);

    private static final Font BRAND_FONT = FontFactory.getFont(FontFactory.COURIER, 16f, Font.BOLD, Color.BLACK);
    private static final Font TAGLINE_FONT = FontFactory.getFont(FontFactory.COURIER, 8f, Font.BOLD, Color.BLACK);
    private static final Font BOLD_FONT = FontFactory.getFont(FontFactory.COURIER, 9f, Font.BOLD, Color.BLACK);
    private static final Font NORMAL_FONT = FontFactory.getFont(FontFactory.COURIER, 9f, Font.NORMAL, Color.BLACK);
    private static final Font SMALL_FONT = FontFactory.getFont(FontFactory.COURIER, 8f, Font.NORMAL, Color.BLACK);
    private static final Font BIG_FONT = FontFactory.getFont(FontFactory.COURIER, 12f, Font.BOLD, Color.BLACK);

    private final OrdersRepository ordersRepository;
    private final SettingsService settingsService;

    @Transactional(readOnly = true)
    public InvoiceResponseDTO generateInvoice(String orderId) {
        Orders order = ordersRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        try {
            Files.createDirectories(Path.of(INVOICE_DIR));

            String filePath = INVOICE_DIR + getInvoiceFileName(order.getId());
            Document document = new Document(RECEIPT_PAGE, 18, 18, 24, 20);
            PdfWriter.getInstance(document, new FileOutputStream(filePath));
            document.open();

            AppSettings settings = settingsService.getSettings();

            buildStoreHeader(document, settings);
            buildMetaAndBillTo(document, order);
            buildItemsTable(document, order);
            buildTotals(document, order, settings);
            buildTermsAndSign(document, settings);

            document.close();

            return new InvoiceResponseDTO(getInvoiceUrl(order.getId()));
        } catch (Exception e) {
            throw new InvoiceGenerationException("Error generating invoice", e);
        }
    }

    private void buildStoreHeader(Document document, AppSettings settings) {
        String businessName = settings.getBusinessName() == null || settings.getBusinessName().isBlank()
                ? "Cloth n Care" : settings.getBusinessName();

        Paragraph name = new Paragraph(businessName, BRAND_FONT);
        name.setAlignment(Element.ALIGN_CENTER);
        name.setSpacingAfter(2);
        document.add(name);

        if (settings.getTagline() != null && !settings.getTagline().isBlank()) {
            addCentered(document, settings.getTagline(), TAGLINE_FONT);
        }
        if (settings.getAddress() != null && !settings.getAddress().isBlank()) {
            addCentered(document, settings.getAddress(), NORMAL_FONT);
        }
        if (settings.getPhone() != null && !settings.getPhone().isBlank()) {
            addCentered(document, "Ph: " + settings.getPhone(), NORMAL_FONT);
        }
        if (settings.getEmail() != null && !settings.getEmail().isBlank()) {
            addCentered(document, settings.getEmail(), NORMAL_FONT);
        }

        addDivider(document);
    }

    private void buildMetaAndBillTo(Document document, Orders order) {
        addMetaRow(document, "Invoice No", order.getInvoice_number() == null ? "N/A" : order.getInvoice_number());
        if (order.getCreated_at() != null) {
            addMetaRow(document, "Date", order.getCreated_at().format(DATE_TIME_FMT));
        }
        if (order.getExpected_delivery_date() != null) {
            addMetaRow(document, "Delivery", order.getExpected_delivery_date().format(DATE_FMT));
        }
        addDivider(document);

        if (order.getCustomer() != null) {
            addLine(document, order.getCustomer().getName(), BOLD_FONT);
            if (order.getCustomer().getAddress() != null && !order.getCustomer().getAddress().isBlank()) {
                addLine(document, order.getCustomer().getAddress(), NORMAL_FONT);
            }
            if (order.getCustomer().getPhone() != null && !order.getCustomer().getPhone().isBlank()) {
                addLine(document, "Mobile : " + order.getCustomer().getPhone(), NORMAL_FONT);
            }
        }
        if (order.getCreatedBy() != null) {
            addLine(document, "Created By : " + order.getCreatedBy().getName(), NORMAL_FONT);
        }

        addDivider(document);
    }

    private void buildItemsTable(Document document, Orders order) {
        PdfPTable table = new PdfPTable(4);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{3.2f, 0.8f, 1.1f, 1.3f});
        table.setSpacingBefore(2);
        table.setSpacingAfter(4);

        addItemCell(table, "Product Name", Element.ALIGN_LEFT, true);
        addItemCell(table, "Qty", Element.ALIGN_CENTER, true);
        addItemCell(table, "Price", Element.ALIGN_RIGHT, true);
        addItemCell(table, "Total", Element.ALIGN_RIGHT, true);

        for (OrdersItems item : order.getItems()) {
            String desc = item.getService_type()
                    + (item.getProduct_type() != null ? " - " + item.getProduct_type() : "");
            BigDecimal lineTotal = item.getPrice()
                    .multiply(BigDecimal.valueOf(item.getQuantity()))
                    .setScale(2, RoundingMode.HALF_UP);
            addItemCell(table, desc, Element.ALIGN_LEFT, false);
            addItemCell(table, String.valueOf(item.getQuantity()), Element.ALIGN_CENTER, false);
            addItemCell(table, fmt(item.getPrice()), Element.ALIGN_RIGHT, false);
            addItemCell(table, fmt(lineTotal), Element.ALIGN_RIGHT, false);
        }

        document.add(table);
        addDivider(document);
    }

    private void buildTotals(Document document, Orders order, AppSettings settings) {
        String symbol = currencySymbol(settings);

        int totalQty = order.getItems().stream()
                .mapToInt(OrdersItems::getQuantity)
                .sum();
        addTotalRow(document, "Total Qty", String.valueOf(totalQty), false);

        BigDecimal subtotal = order.getItems().stream()
                .map(item -> item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        addTotalRow(document, "Sub Total", money(subtotal, symbol), false);

        if (order.getDiscount() != null && order.getDiscount().compareTo(BigDecimal.ZERO) > 0) {
            addTotalRow(document, "Discount", "-" + money(order.getDiscount(), symbol), false);
        }
        if (order.getTax_amount() != null && order.getTax_amount().compareTo(BigDecimal.ZERO) > 0) {
            addTotalRow(document, "Tax", money(order.getTax_amount(), symbol), false);
        }

        addTotalRow(document, "Bill Amount", money(order.getTotal_price(), symbol), true);
        addTotalRow(document, "Total Payable", money(order.getBalanceDue(), symbol), true);
    }

    private void buildTermsAndSign(Document document, AppSettings settings) {
        if (settings.getTermsAndConditions() != null && !settings.getTermsAndConditions().isBlank()) {
            Paragraph heading = new Paragraph("Terms & Conditions", BOLD_FONT);
            heading.setSpacingBefore(6);
            heading.setSpacingAfter(2);
            document.add(heading);
            for (String line : settings.getTermsAndConditions().split("\n")) {
                if (!line.isBlank()) {
                    addLine(document, line.trim(), SMALL_FONT);
                }
            }
        }

        addDivider(document);

        PdfPTable sign = new PdfPTable(2);
        sign.setWidthPercentage(100);
        sign.setWidths(new float[]{1f, 2f});
        sign.setSpacingAfter(4);

        PdfPCell label = new PdfPCell(new Phrase("Customer Sign :", BOLD_FONT));
        label.setBorder(Rectangle.NO_BORDER);
        label.setPaddingTop(12);
        label.setPaddingBottom(8);
        sign.addCell(label);

        PdfPCell line = new PdfPCell(new Phrase(" "));
        line.setBorder(Rectangle.BOTTOM);
        line.setBorderWidth(0.8f);
        line.setPaddingTop(12);
        line.setPaddingBottom(8);
        sign.addCell(line);

        document.add(sign);

        if (settings.getInvoiceFooter() != null && !settings.getInvoiceFooter().isBlank()) {
            addCentered(document, settings.getInvoiceFooter(), BOLD_FONT);
        }
    }

    private void addMetaRow(Document document, String label, String value) {
        Paragraph paragraph = new Paragraph(label + " : " + value, NORMAL_FONT);
        paragraph.setSpacingAfter(2);
        document.add(paragraph);
    }

    private void addLine(Document document, String text, Font font) {
        Paragraph paragraph = new Paragraph(text, font);
        paragraph.setSpacingAfter(2);
        document.add(paragraph);
    }

    private void addCentered(Document document, String text, Font font) {
        Paragraph paragraph = new Paragraph(text, font);
        paragraph.setAlignment(Element.ALIGN_CENTER);
        paragraph.setSpacingAfter(2);
        document.add(paragraph);
    }

    private void addTotalRow(Document document, String label, String value, boolean emphasize) {
        Paragraph row = new Paragraph(label + " :   " + value, emphasize ? BIG_FONT : NORMAL_FONT);
        row.setAlignment(Element.ALIGN_RIGHT);
        row.setSpacingBefore(emphasize ? 3 : 0);
        row.setSpacingAfter(3);
        document.add(row);
    }

    private void addDivider(Document document) {
        PdfPTable line = new PdfPTable(1);
        line.setWidthPercentage(100);
        line.setSpacingAfter(3);
        PdfPCell cell = new PdfPCell(new Phrase(" "));
        cell.setBorder(Rectangle.BOTTOM);
        cell.setBorderWidth(0.5f);
        cell.setPadding(0);
        cell.setFixedHeight(2);
        line.addCell(cell);
        document.add(line);
    }

    private void addItemCell(PdfPTable table, String text, int alignment, boolean header) {
        PdfPCell cell = new PdfPCell(new Phrase(text, header ? BOLD_FONT : NORMAL_FONT));
        cell.setBorder(Rectangle.BOTTOM);
        cell.setBorderWidth(0.4f);
        cell.setPadding(3);
        cell.setHorizontalAlignment(alignment);
        table.addCell(cell);
    }

    private String currencySymbol(AppSettings settings) {
        String code = settings.getCurrencyCode() == null || settings.getCurrencyCode().isBlank()
                ? "INR" : settings.getCurrencyCode();
        if ("INR".equalsIgnoreCase(code)) {
            return "\u20B9"; // ₹
        }
        if ("USD".equalsIgnoreCase(code)) {
            return "$";
        }
        if ("EUR".equalsIgnoreCase(code)) {
            return "\u20AC"; // €
        }
        return code + " ";
    }

    private String money(BigDecimal value, String symbol) {
        return symbol + fmt(value);
    }

    private String fmt(BigDecimal value) {
        if (value == null) {
            return "0.00";
        }
        return value.setScale(2, RoundingMode.HALF_UP).toPlainString();
    }

    public String getInvoiceUrl(String orderId) {
        return INVOICE_URL_PREFIX + getInvoiceFileName(orderId);
    }

    public boolean invoiceExists(String orderId) {
        return Files.exists(Path.of(INVOICE_DIR + getInvoiceFileName(orderId)));
    }

    public String getAvailableInvoiceUrl(String orderId) {
        return invoiceExists(orderId) ? getInvoiceUrl(orderId) : "";
    }

    public void deleteInvoice(String orderId) {
        try {
            Path file = Path.of(INVOICE_DIR + getInvoiceFileName(orderId));
            Files.deleteIfExists(file);
        } catch (IOException e) {
            throw new InvoiceGenerationException("Error deleting invoice", e);
        }
    }

    private String getInvoiceFileName(String orderId) {
        return "INV-" + orderId + ".pdf";
    }
}