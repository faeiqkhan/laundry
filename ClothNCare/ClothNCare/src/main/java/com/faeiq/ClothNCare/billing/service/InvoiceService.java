package com.faeiq.ClothNCare.billing.service;

import com.faeiq.ClothNCare.billing.dto.InvoiceResponseDTO;
import com.faeiq.ClothNCare.common.exception.InvoiceGenerationException;
import com.faeiq.ClothNCare.common.exception.ResourceNotFoundException;
import com.faeiq.ClothNCare.orders.entity.Orders;
import com.faeiq.ClothNCare.orders.entity.OrdersItems;
import com.faeiq.ClothNCare.orders.repository.OrdersRepository;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.FileOutputStream;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class InvoiceService {

    private static final String INVOICE_DIR = "invoices/";
    private static final String INVOICE_URL_PREFIX = "/invoices/";

    private final OrdersRepository ordersRepository;

    @Transactional(readOnly = true)
    public InvoiceResponseDTO generateInvoice(String orderId) {
        Orders order = ordersRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        try {
            Files.createDirectories(Path.of(INVOICE_DIR));

            String filePath = INVOICE_DIR + getInvoiceFileName(order.getId());
            Document document = new Document();
            PdfWriter.getInstance(document, new FileOutputStream(filePath));

            document.open();

            Font titleFont = new Font(Font.HELVETICA, 18, Font.BOLD);
            Paragraph title = new Paragraph("Cloth n Care - Invoice", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            document.add(title);

            document.add(new Paragraph(" "));
            document.add(new Paragraph("Customer: " + order.getCustomer().getName()));
            document.add(new Paragraph("Phone: " + order.getCustomer().getPhone()));
            document.add(new Paragraph("Date: " + order.getCreated_at().format(DateTimeFormatter.ofPattern("dd-MM-yyyy"))));
            document.add(new Paragraph(" "));

            for (OrdersItems item : order.getItems()) {
                BigDecimal lineTotal = item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity()));
                document.add(new Paragraph(
                        item.getService_type() + " - " +
                                item.getProduct_type() + " x " +
                                item.getQuantity() + " = INR " +
                                lineTotal
                ));
            }

            document.add(new Paragraph(" "));
            Font bold = new Font(Font.HELVETICA, 14, Font.BOLD);
            document.add(new Paragraph("Total: INR " + order.getTotal_price(), bold));

            document.close();

            return new InvoiceResponseDTO(getInvoiceUrl(order.getId()));
        } catch (Exception e) {
            throw new InvoiceGenerationException("Error generating invoice", e);
        }
    }

    public String getInvoiceUrl(String orderId) {
        return INVOICE_URL_PREFIX + getInvoiceFileName(orderId);
    }

    private String getInvoiceFileName(String orderId) {
        return "INV-" + orderId + ".pdf";
    }
}
