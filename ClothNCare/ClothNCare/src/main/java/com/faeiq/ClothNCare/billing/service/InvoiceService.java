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
import com.lowagie.text.Image;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.lowagie.text.pdf.BaseFont;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.format.DateTimeFormatter;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.qrcode.QRCodeWriter;

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
    private static final Font NORMAL_FONT = FontFactory.getFont(FontFactory.COURIER, 10f, Font.BOLD, Color.BLACK);
    private static final Font SMALL_FONT = FontFactory.getFont(FontFactory.COURIER, 10f, Font.BOLD, Color.BLACK);
    private static final Font BIG_FONT = FontFactory.getFont(FontFactory.COURIER, 12f, Font.BOLD, Color.BLACK);

    private static volatile BaseFont devanagariBaseFont;

    private static BaseFont devanagariBaseFont() {
        BaseFont font = devanagariBaseFont;
        if (font != null) {
            return font;
        }
        try (InputStream is = InvoiceService.class.getResourceAsStream("/fonts/NotoSansDevanagari-Regular.ttf")) {
            if (is == null) {
                return null;
            }
            byte[] data = is.readAllBytes();
            font = BaseFont.createFont("NotoSansDevanagari-Regular.ttf", BaseFont.IDENTITY_H, BaseFont.EMBEDDED, false, data, null);
        } catch (Exception e) {
            font = null;
        }
        devanagariBaseFont = font;
        return font;
    }

    private static boolean hasDevanagari(String text) {
        if (text == null || text.isBlank()) {
            return false;
        }
        return text.chars().anyMatch(codePoint -> codePoint > 0xFF);
    }

    private static Font fontFor(String text, float size, int style) {
        BaseFont devanagari = devanagariBaseFont();
        if (devanagari != null && hasDevanagari(text)) {
            return new Font(devanagari, size, Font.BOLD);
        }
        return FontFactory.getFont(FontFactory.COURIER, size, Font.BOLD, Color.BLACK);
    }

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
            buildTermsAndSign(document, order, settings);

            document.close();

            return new InvoiceResponseDTO(getInvoiceUrl(order.getId()));
        } catch (Exception e) {
            throw new InvoiceGenerationException("Error generating invoice", e);
        }
    }

    private void buildStoreHeader(Document document, AppSettings settings) {
        String businessName = settings.getBusinessName() == null || settings.getBusinessName().isBlank()
                ? "Cloth n Care" : settings.getBusinessName();

        Paragraph name = new Paragraph(businessName, fontFor(businessName, 16f, Font.BOLD));
        name.setAlignment(Element.ALIGN_CENTER);
        name.setSpacingAfter(2);
        document.add(name);

        if (settings.getTagline() != null && !settings.getTagline().isBlank()) {
            addCentered(document, settings.getTagline(), fontFor(settings.getTagline(), 9f, Font.BOLD));
        }
        if (settings.getAddress() != null && !settings.getAddress().isBlank()) {
            addCentered(document, settings.getAddress(), fontFor(settings.getAddress(), 10f, Font.BOLD));
        }
        if (settings.getPhone() != null && !settings.getPhone().isBlank()) {
            addCentered(document, "Ph: " + settings.getPhone(), fontFor("Ph: " + settings.getPhone(), 10f, Font.BOLD));
        }
        if (settings.getEmail() != null && !settings.getEmail().isBlank()) {
            addCentered(document, settings.getEmail(), fontFor(settings.getEmail(), 10f, Font.BOLD));
        }

        addDivider(document);
    }

    private void buildMetaAndBillTo(Document document, Orders order) {
        String invoiceDisplay = order.getInvoice_number();
        if (invoiceDisplay != null) {
            invoiceDisplay = invoiceDisplay.replaceFirst("(?i)inv[-_]?", "").trim();
        }
        addMetaRow(document, "Invoice No", invoiceDisplay == null ? "N/A" : invoiceDisplay);
        if (order.getCreated_at() != null) {
            addMetaRow(document, "Date", order.getCreated_at().format(DATE_TIME_FMT));
        }
        if (order.getExpected_delivery_date() != null) {
            addMetaRow(document, "Delivery", order.getExpected_delivery_date().format(DATE_FMT));
        }
        addDivider(document);

        if (order.getCustomer() != null) {
            addLine(document, order.getCustomer().getName(), fontFor(order.getCustomer().getName(), 10f, Font.BOLD));
            if (order.getCustomer().getAddress() != null && !order.getCustomer().getAddress().isBlank()) {
                addLine(document, order.getCustomer().getAddress(), fontFor(order.getCustomer().getAddress(), 10f, Font.BOLD));
            }
            if (order.getCustomer().getPhone() != null && !order.getCustomer().getPhone().isBlank()) {
                addLine(document, "Mobile : " + order.getCustomer().getPhone(), fontFor("Mobile : " + order.getCustomer().getPhone(), 10f, Font.BOLD));
            }
        }
        if (order.getCreatedBy() != null) {
            addLine(document, "Created By : " + order.getCreatedBy().getName(), fontFor("Created By : " + order.getCreatedBy().getName(), 10f, Font.BOLD));
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
            String desc = (item.getProduct_name() != null ? item.getProduct_name() : item.getService_type())
                    + (item.getProduct_type() != null ? " - " + item.getProduct_type() : "");
            BigDecimal lineTotal = item.getLineTotal()
                    .setScale(2, RoundingMode.HALF_UP);
            addItemCell(table, desc, Element.ALIGN_LEFT, false);
            addItemCell(table, fmtQty(item.getQuantity()), Element.ALIGN_CENTER, false);
            addItemCell(table, fmt(item.getPrice()), Element.ALIGN_RIGHT, false);
            addItemCell(table, fmt(lineTotal), Element.ALIGN_RIGHT, false);
        }

        document.add(table);
        addDivider(document);
    }

    private void buildTotals(Document document, Orders order, AppSettings settings) {
        String symbol = currencySymbol(settings);

        BigDecimal totalQty = order.getItems() == null ? BigDecimal.ZERO : order.getItems().stream()
                .map(item -> item.getQuantity() == null ? BigDecimal.ZERO : item.getQuantity())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        addTotalRow(document, "Total Qty", fmtQty(totalQty), false);

        BigDecimal subtotal = order.getItems() == null ? BigDecimal.ZERO : order.getItems().stream()
                .map(item -> item.getLineTotal() == null ? BigDecimal.ZERO : item.getLineTotal())
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

    private void buildTermsAndSign(Document document, Orders order, AppSettings settings) throws Exception {
        if (settings.getTermsAndConditions() != null && !settings.getTermsAndConditions().isBlank()) {
            Paragraph heading = new Paragraph("Terms & Conditions", BOLD_FONT);
            heading.setSpacingBefore(6);
            heading.setSpacingAfter(2);
            document.add(heading);
            for (String line : settings.getTermsAndConditions().split("\n")) {
                if (!line.isBlank()) {
                    addLine(document, line.trim(), fontFor(line.trim(), 8f, Font.NORMAL));
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

        addPaymentQr(document, order, settings);
        addStoreSignature(document, settings);

        if (settings.getInvoiceFooter() != null && !settings.getInvoiceFooter().isBlank()) {
            addCentered(document, settings.getInvoiceFooter(), BOLD_FONT);
        }
    }

    private void addPaymentQr(Document document, Orders order, AppSettings settings) throws Exception {
        BigDecimal due = order.getBalanceDue();
        if (due == null || due.compareTo(BigDecimal.ZERO) <= 0 || settings.getUpiId() == null || settings.getUpiId().isBlank()) return;
        String note = "Invoice " + (order.getInvoice_number() == null ? order.getId() : order.getInvoice_number());
        String uri = "upi://pay?pa=" + URLEncoder.encode(settings.getUpiId(), StandardCharsets.UTF_8)
                + "&pn=" + URLEncoder.encode(settings.getBusinessName(), StandardCharsets.UTF_8)
                + "&am=" + due.setScale(2, RoundingMode.HALF_UP).toPlainString()
                + "&cu=INR&tn=" + URLEncoder.encode(note, StandardCharsets.UTF_8);
        BufferedImage matrix = new BufferedImage(120, 120, BufferedImage.TYPE_INT_RGB);
        var bits = new QRCodeWriter().encode(uri, BarcodeFormat.QR_CODE, 120, 120);
        for (int y = 0; y < 120; y++) for (int x = 0; x < 120; x++) matrix.setRGB(x, y, bits.get(x, y) ? Color.BLACK.getRGB() : Color.WHITE.getRGB());
        ByteArrayOutputStream bytes = new ByteArrayOutputStream(); ImageIO.write(matrix, "png", bytes);
        addCentered(document, "Scan to Pay " + money(due, currencySymbol(settings)), BOLD_FONT);
        Image qr = Image.getInstance(bytes.toByteArray()); qr.setAlignment(Element.ALIGN_CENTER); qr.scaleToFit(105, 105); document.add(qr);
    }

    private void addStoreSignature(Document document, AppSettings settings) throws Exception {
        if (settings.getStoreSignaturePath() == null || settings.getStoreSignaturePath().isBlank() || !Files.exists(Path.of(settings.getStoreSignaturePath()))) return;
        Image signature = Image.getInstance(settings.getStoreSignaturePath()); signature.setAlignment(Element.ALIGN_CENTER); signature.scaleToFit(120, 45); document.add(signature);
        addCentered(document, "Authorized Signature", SMALL_FONT);
    }

    private void addMetaRow(Document document, String label, String value) {
        Paragraph paragraph = new Paragraph(label + " : " + value, fontFor(label + " : " + value, 10f, Font.BOLD));
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
        float size = emphasize ? BIG_FONT.getSize() : NORMAL_FONT.getSize();
        int style = emphasize ? BIG_FONT.getStyle() : NORMAL_FONT.getStyle();
        Paragraph row = new Paragraph(label + " :   " + value, fontFor(label + " :   " + value, size, style));
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
        PdfPCell cell = new PdfPCell(new Phrase(text, header ? BOLD_FONT : fontFor(text, 9f, Font.NORMAL)));
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

    private String fmtQty(BigDecimal value) {
        if (value == null) {
            return "0";
        }
        BigDecimal stripped = value.stripTrailingZeros();
        if (stripped.scale() <= 0) {
            return stripped.toBigInteger().toString();
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
