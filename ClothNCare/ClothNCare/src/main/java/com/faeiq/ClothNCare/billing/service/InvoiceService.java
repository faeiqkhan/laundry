package com.faeiq.ClothNCare.billing.service;

import com.faeiq.ClothNCare.billing.dto.InvoiceResponseDTO;
import com.faeiq.ClothNCare.common.exception.InvoiceGenerationException;
import com.faeiq.ClothNCare.common.exception.ResourceNotFoundException;
import com.faeiq.ClothNCare.orders.entity.Orders;
import com.faeiq.ClothNCare.orders.entity.OrdersItems;
import com.faeiq.ClothNCare.orders.entity.Payment;
import com.faeiq.ClothNCare.orders.repository.OrdersRepository;
import com.faeiq.ClothNCare.settings.entity.AppSettings;
import com.faeiq.ClothNCare.settings.service.SettingsService;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.Image;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.image.BufferedImage;
import java.io.FileOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class InvoiceService {

    private static final String INVOICE_DIR = "invoices/";
    private static final String INVOICE_URL_PREFIX = "/invoices/";

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd MMM yyyy");

    private static final Font HEADER_FONT = new Font(Font.HELVETICA, 22, Font.BOLD);
    private static final Font TAGLINE_FONT = new Font(Font.HELVETICA, 11, Font.ITALIC);
    private static final Font SECTION_FONT = new Font(Font.HELVETICA, 12, Font.BOLD);
    private static final Font NORMAL_FONT = new Font(Font.HELVETICA, 10, Font.NORMAL);
    private static final Font SMALL_FONT = new Font(Font.HELVETICA, 8, Font.NORMAL);
    private static final Font BOLD_FONT = new Font(Font.HELVETICA, 10, Font.BOLD);

    private static final java.awt.Color ACCENT = new java.awt.Color(30, 96, 163);
    private static final java.awt.Color DARK = new java.awt.Color(51, 51, 51);
    private static final java.awt.Color LIGHT_GRAY = new java.awt.Color(243, 245, 248);
    private static final java.awt.Color BORDER_GRAY = new java.awt.Color(210, 214, 220);

    private final OrdersRepository ordersRepository;
    private final SettingsService settingsService;

    @Transactional(readOnly = true)
    public InvoiceResponseDTO generateInvoice(String orderId) {
        Orders order = ordersRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        try {
            Files.createDirectories(Path.of(INVOICE_DIR));

            String filePath = INVOICE_DIR + getInvoiceFileName(order.getId());
            Document document = new Document(PageSize.A4, 36, 36, 40, 40);
            PdfWriter.getInstance(document, new FileOutputStream(filePath));
            document.open();

            AppSettings settings = settingsService.getSettings();
            String currency = settings.getCurrencyCode() == null || settings.getCurrencyCode().isBlank()
                    ? "INR" : settings.getCurrencyCode();

            buildHeader(document, settings);
            buildMetaAndBillTo(document, order, settings);
            buildItemsTable(document, order, currency);
            buildTotals(document, order, currency);
            buildPayments(document, order, currency);
            buildTerms(document, settings);
            buildFooter(document, order, settings, currency);

            document.close();

            return new InvoiceResponseDTO(getInvoiceUrl(order.getId()));
        } catch (Exception e) {
            throw new InvoiceGenerationException("Error generating invoice", e);
        }
    }

    private void buildHeader(Document document, AppSettings settings) {
        String businessName = settings.getBusinessName() == null || settings.getBusinessName().isBlank()
                ? "Cloth n Care" : settings.getBusinessName();

        Paragraph name = new Paragraph(businessName, HEADER_FONT);
        name.setSpacingAfter(2);
        document.add(name);

        if (settings.getTagline() != null && !settings.getTagline().isBlank()) {
            Paragraph tagline = new Paragraph(settings.getTagline(), TAGLINE_FONT);
            tagline.setSpacingAfter(6);
            document.add(tagline);
        }

        StringBuilder contact = new StringBuilder();
        if (settings.getPhone() != null && !settings.getPhone().isBlank()) {
            contact.append("Phone: ").append(settings.getPhone());
        }
        if (settings.getEmail() != null && !settings.getEmail().isBlank()) {
            if (contact.length() > 0) contact.append("  |  ");
            contact.append("Email: ").append(settings.getEmail());
        }
        if (settings.getAddress() != null && !settings.getAddress().isBlank()) {
            if (contact.length() > 0) contact.append("  |  ");
            contact.append(settings.getAddress());
        }
        if (contact.length() > 0) {
            Paragraph contactLine = new Paragraph(contact.toString(), NORMAL_FONT);
            contactLine.setSpacingAfter(10);
            document.add(contactLine);
        }

        PdfPCell rule = new PdfPCell(new Phrase(" ", new Font(Font.HELVETICA, 1)));
        rule.setBorderWidthTop(2);
        rule.setBorderWidthLeft(0);
        rule.setBorderWidthRight(0);
        rule.setBorderWidthBottom(0);
        rule.setBorderColor(ACCENT);
        rule.setFixedHeight(2);
        PdfPTable ruleTable = new PdfPTable(1);
        ruleTable.setWidthPercentage(100);
        ruleTable.setSpacingAfter(12);
        ruleTable.addCell(rule);
        document.add(ruleTable);
    }

    private void buildMetaAndBillTo(Document document, Orders order, AppSettings settings) {
        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setSpacingAfter(10);

        PdfPCell billTo = new PdfPCell();
        billTo.setBorder(Rectangle.NO_BORDER);
        billTo.addElement(new Paragraph("BILL TO", SECTION_FONT));
        if (order.getCustomer() != null) {
            billTo.addElement(new Paragraph(order.getCustomer().getName(), BOLD_FONT));
            if (order.getCustomer().getAddress() != null && !order.getCustomer().getAddress().isBlank()) {
                billTo.addElement(new Paragraph(order.getCustomer().getAddress(), NORMAL_FONT));
            }
            if (order.getCustomer().getPhone() != null && !order.getCustomer().getPhone().isBlank()) {
                billTo.addElement(new Paragraph("Phone: " + order.getCustomer().getPhone(), NORMAL_FONT));
            }
            if (order.getCustomer().getEmail() != null && !order.getCustomer().getEmail().isBlank()) {
                billTo.addElement(new Paragraph("Email: " + order.getCustomer().getEmail(), NORMAL_FONT));
            }
        }
        table.addCell(billTo);

        PdfPCell meta = new PdfPCell();
        meta.setBorder(Rectangle.NO_BORDER);
        meta.setHorizontalAlignment(Element.ALIGN_RIGHT);
        meta.addElement(new Paragraph("INVOICE", new Font(Font.HELVETICA, 16, Font.BOLD, ACCENT)));
        String invoiceNumber = order.getInvoice_number() == null ? "N/A" : order.getInvoice_number();
        meta.addElement(new Paragraph("Invoice No: " + invoiceNumber, NORMAL_FONT));
        if (order.getCreated_at() != null) {
            meta.addElement(new Paragraph("Date: " + order.getCreated_at().format(DATE_FMT), NORMAL_FONT));
        }
        if (order.getExpected_delivery_date() != null) {
            meta.addElement(new Paragraph("Expected Delivery: " + order.getExpected_delivery_date().format(DATE_FMT), NORMAL_FONT));
        }
        if (order.getStatus() != null) {
            meta.addElement(new Paragraph("Status: " + order.getStatus(), NORMAL_FONT));
        }
        table.addCell(meta);

        document.add(table);
    }

    private void buildItemsTable(Document document, Orders order, String currency) {
        PdfPTable table = new PdfPTable(4);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{5f, 1.2f, 1.8f, 2f});
        table.setSpacingBefore(4);
        table.setSpacingAfter(8);

        addCell(table, "ITEM", true);
        addCell(table, "QTY", true);
        addCell(table, "RATE (" + currency + ")", true);
        addCell(table, "AMOUNT (" + currency + ")", true);

        for (OrdersItems item : order.getItems()) {
            String desc = item.getService_type() + (item.getProduct_type() != null ? " - " + item.getProduct_type() : "");
            addCell(table, desc, false);
            addCell(table, String.valueOf(item.getQuantity()), false);
            addCell(table, fmt(item.getPrice()), false);
            BigDecimal lineTotal = item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity()))
                    .setScale(2, RoundingMode.HALF_UP);
            addCell(table, fmt(lineTotal), false);
        }

        document.add(table);
    }

    private void buildTotals(Document document, Orders order, String currency) {
        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{5f, 2.5f});
        table.setSpacingAfter(8);

        PdfPCell spacer = new PdfPCell(new Phrase(" "));
        spacer.setBorder(Rectangle.NO_BORDER);
        table.addCell(spacer);

        PdfPTable totals = new PdfPTable(2);
        totals.setWidthPercentage(100);
        totals.setWidths(new float[]{1.5f, 1f});

        BigDecimal subtotal = order.getItems().stream()
                .map(item -> item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        addTotalRow(totals, "Subtotal", fmt(subtotal), false);
        if (order.getDiscount() != null && order.getDiscount().compareTo(BigDecimal.ZERO) > 0) {
            addTotalRow(totals, "Discount", "-" + fmt(order.getDiscount()), false);
        }
        if (order.getTax_amount() != null && order.getTax_amount().compareTo(BigDecimal.ZERO) > 0) {
            addTotalRow(totals, "Tax", fmt(order.getTax_amount()), false);
        }
        addTotalRow(totals, "Grand Total", fmt(order.getTotal_price()), true);
        if (order.getPaid_amount() != null && order.getPaid_amount().compareTo(BigDecimal.ZERO) > 0) {
            addTotalRow(totals, "Paid", "-" + fmt(order.getPaid_amount()), false);
        }
        BigDecimal due = order.getBalanceDue();
        addTotalRow(totals, "Balance Due", fmt(due), true);

        table.addCell(totals);
        document.add(table);
    }

    private void buildPayments(Document document, Orders order, String currency) {
        if (order.getPayments() == null || order.getPayments().isEmpty()) {
            return;
        }

        document.add(new Paragraph("PAYMENTS RECEIVED", SECTION_FONT));

        PdfPTable table = new PdfPTable(4);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{2f, 1.5f, 2f, 2.5f});
        table.setSpacingBefore(4);
        table.setSpacingAfter(8);

        addCell(table, "DATE", true);
        addCell(table, "AMOUNT (" + currency + ")", true);
        addCell(table, "METHOD", true);
        addCell(table, "RECORDED BY", true);

        for (Payment payment : order.getPayments()) {
            addCell(table, payment.getPaidAt() != null ? payment.getPaidAt().format(DATE_FMT) : "", false);
            addCell(table, fmt(payment.getAmount()), false);
            addCell(table, payment.getMethod() != null ? payment.getMethod().toString() : "", false);
            addCell(table, payment.getRecordedBy() != null ? payment.getRecordedBy().getName() : "", false);
        }

        document.add(table);
    }

    private void buildTerms(Document document, AppSettings settings) {
        if (settings.getTermsAndConditions() == null || settings.getTermsAndConditions().isBlank()) {
            return;
        }
        document.add(new Paragraph("TERMS & CONDITIONS", SECTION_FONT));
        for (String line : settings.getTermsAndConditions().split("\n")) {
            if (!line.isBlank()) {
                Paragraph term = new Paragraph(line.trim(), SMALL_FONT);
                term.setSpacingAfter(1);
                document.add(term);
            }
        }
        PdfPTable rule = new PdfPTable(1);
        rule.setWidthPercentage(100);
        rule.setSpacingBefore(6);
        PdfPCell divider = new PdfPCell(new Phrase(" ", new Font(Font.HELVETICA, 1)));
        divider.setBorderWidthTop(0.5f);
        divider.setBorderWidthLeft(0);
        divider.setBorderWidthRight(0);
        divider.setBorderWidthBottom(0);
        divider.setBorderColor(BORDER_GRAY);
        divider.setFixedHeight(1);
        rule.addCell(divider);
        document.add(rule);
    }

    private void buildFooter(Document document, Orders order, AppSettings settings, String currency)
            throws WriterException, IOException {
        PdfPTable footer = new PdfPTable(2);
        footer.setWidthPercentage(100);
        footer.setWidths(new float[]{1.5f, 1f});
        footer.setSpacingBefore(6);

        PdfPCell textCell = new PdfPCell();
        textCell.setBorder(Rectangle.NO_BORDER);
        textCell.setVerticalAlignment(Element.ALIGN_BOTTOM);

        if (settings.getInvoiceFooter() != null && !settings.getInvoiceFooter().isBlank()) {
            Paragraph thanks = new Paragraph(settings.getInvoiceFooter(), BOLD_FONT);
            thanks.setSpacingAfter(6);
            textCell.addElement(thanks);
        }

        String qrPayload = "INVOICE\n"
                + "Invoice No: " + (order.getInvoice_number() == null ? "N/A" : order.getInvoice_number())
                + "\nTotal: " + currency + " " + fmt(order.getTotal_price())
                + "\nPaid: " + currency + " " + fmt(order.getPaid_amount())
                + "\nBalance Due: " + currency + " " + fmt(order.getBalanceDue());
        Image qr = generateQr(qrPayload, 90);
        PdfPCell qrCell = new PdfPCell();
        qrCell.setBorder(Rectangle.NO_BORDER);
        qrCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        qrCell.setVerticalAlignment(Element.ALIGN_BOTTOM);
        qrCell.addElement(qr);
        qrCell.addElement(new Paragraph("Scan for invoice details", SMALL_FONT));

        footer.addCell(textCell);
        footer.addCell(qrCell);
        document.add(footer);
    }

    private Image generateQr(String content, int size) throws WriterException, IOException {
        Map<com.google.zxing.EncodeHintType, Object> hints = new HashMap<>();
        hints.put(com.google.zxing.EncodeHintType.MARGIN, 0);
        BitMatrix matrix = new QRCodeWriter().encode(content, BarcodeFormat.QR_CODE, size, size, hints);
        BufferedImage buffered = MatrixToImageWriter.toBufferedImage(matrix);
        Image qr = Image.getInstance(buffered, null);
        qr.scaleToFit(size, size);
        return qr;
    }

    private void addCell(PdfPTable table, String text, boolean header) {
        PdfPCell cell = new PdfPCell(new Phrase(text, header ? BOLD_FONT : NORMAL_FONT));
        cell.setPadding(6);
        cell.setHorizontalAlignment(Element.ALIGN_LEFT);
        if (header) {
            cell.setBackgroundColor(ACCENT);
            cell.setBorderColor(ACCENT);
        } else {
            cell.setBorderColor(BORDER_GRAY);
            cell.setPaddingTop(4);
            cell.setPaddingBottom(4);
        }
        table.addCell(cell);
    }

    private void addTotalRow(PdfPTable table, String label, String value, boolean emphasize) {
        Font labelFont = emphasize ? BOLD_FONT : NORMAL_FONT;
        Font valueFont = emphasize ? BOLD_FONT : NORMAL_FONT;
        PdfPCell lc = new PdfPCell(new Phrase(label, labelFont));
        lc.setBorder(Rectangle.NO_BORDER);
        lc.setHorizontalAlignment(Element.ALIGN_RIGHT);
        lc.setPadding(2);
        PdfPCell vc = new PdfPCell(new Phrase(value, valueFont));
        vc.setBorder(Rectangle.NO_BORDER);
        vc.setHorizontalAlignment(Element.ALIGN_RIGHT);
        vc.setPadding(2);
        if (emphasize) {
            lc.setBackgroundColor(LIGHT_GRAY);
            vc.setBackgroundColor(LIGHT_GRAY);
        }
        table.addCell(lc);
        table.addCell(vc);
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
