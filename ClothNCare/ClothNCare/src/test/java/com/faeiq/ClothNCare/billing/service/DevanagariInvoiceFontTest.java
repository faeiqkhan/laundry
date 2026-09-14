package com.faeiq.ClothNCare.billing.service;

import com.lowagie.text.pdf.BaseFont;
import org.junit.jupiter.api.Test;

import java.io.InputStream;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DevanagariInvoiceFontTest {

    @Test
    void bundledDevanagariFontIsValidForOpenPdf() throws Exception {
        try (InputStream is = DevanagariInvoiceFontTest.class.getResourceAsStream("/fonts/NotoSansDevanagari-Regular.ttf")) {
            assertNotNull(is, "bundled Noto Sans Devanagari font must exist on classpath");
            byte[] data = is.readAllBytes();
            assertTrue(data.length > 1000, "font file should not be trivial");
            BaseFont font = BaseFont.createFont(
                    "NotoSansDevanagari-Regular.ttf",
                    BaseFont.IDENTITY_H,
                    BaseFont.EMBEDDED,
                    false,
                    data,
                    null);
            assertNotNull(font);
        }
    }
}