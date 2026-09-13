package com.faeiq.ClothNCare.messaging;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PhoneNumberUtilTest {

    @Test
    void normalizesTenDigitToDefaultCountry() {
        assertEquals("919876543210", PhoneNumberUtil.toE164("9876543210", "IN"));
    }

    @Test
    void normalizesZeroPrefixedNumber() {
        assertEquals("919876543210", PhoneNumberUtil.toE164("09876543210", "IN"));
    }

    @Test
    void keepsAlreadyPrefixedNumber() {
        assertEquals("919876543210", PhoneNumberUtil.toE164("919876543210", "IN"));
    }

    @Test
    void handlesPlusAndSpaces() {
        assertEquals("919876543210", PhoneNumberUtil.toE164("+91 98765 43210", "IN"));
    }

    @Test
    void honorsAlternateCountryCode() {
        assertEquals("9719876543210", PhoneNumberUtil.toE164("9876543210", "AE"));
    }

    @Test
    void rejectsGarbage() {
        assertNull(PhoneNumberUtil.toE164(null, "IN"));
        assertNull(PhoneNumberUtil.toE164("", "IN"));
        assertNull(PhoneNumberUtil.toE164("12345", "IN"));
        assertNull(PhoneNumberUtil.toE164("abc def", "IN"));
    }

    @Test
    void validityMirrorsNormalization() {
        assertTrue(PhoneNumberUtil.isValidForWhatsApp("9876543210", "IN"));
        assertTrue(PhoneNumberUtil.isValidForWhatsApp("+91 98765 43210", "IN"));
        assertFalse(PhoneNumberUtil.isValidForWhatsApp("12", "IN"));
        assertFalse(PhoneNumberUtil.isValidForWhatsApp("", "IN"));
    }
}