package com.faeiq.ClothNCare.messaging;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Centralized phone normalization for WhatsApp messaging.
 * Mirrors the Node WhatsApp service's phone.js so both layers interpret the
 * same numbers identically. Accepts +91XXXXXXXXXX, 91XXXXXXXXXX, 0XXXXXXXXX,
 * XXXXXXXXXX. The default country (IN = 91) is configurable via
 * WHATSAPP_DEFAULT_COUNTRY.
 */
public final class PhoneNumberUtil {

    private static final Map<String, String> COUNTRY_CODES = new LinkedHashMap<>();

    static {
        COUNTRY_CODES.put("IN", "91");
        COUNTRY_CODES.put("US", "1");
        COUNTRY_CODES.put("AE", "971");
        COUNTRY_CODES.put("SA", "966");
        COUNTRY_CODES.put("GB", "44");
        COUNTRY_CODES.put("PK", "92");
        COUNTRY_CODES.put("BD", "880");
        COUNTRY_CODES.put("LK", "94");
        COUNTRY_CODES.put("NP", "977");
    }

    private PhoneNumberUtil() {
    }

    private static String dialCode(String country) {
        String resolved = COUNTRY_CODES.get((country == null ? "" : country).toUpperCase());
        return resolved != null ? resolved : COUNTRY_CODES.get("IN");
    }

    /**
     * Normalize a raw number to E.164 digits without '+', e.g. "9198XXXXXXXX".
     * Returns null when the number cannot be safely interpreted.
     */
    public static String toE164(String raw, String country) {
        if (raw == null) {
            return null;
        }
        String digits = raw.replaceAll("\\D", "");
        if (digits.isEmpty()) {
            return null;
        }
        String cc = dialCode(country);
        int len = digits.length();
        if (len == 10) {
            return cc + digits;
        }
        if (len == 11 && digits.startsWith("0")) {
            return cc + digits.substring(1);
        }
        if (len == 12 && digits.startsWith(cc)) {
            return digits;
        }
        if (len == 10 + cc.length() && digits.startsWith(cc)) {
            return digits;
        }
        return null;
    }

    public static boolean isValidForWhatsApp(String raw, String country) {
        return toE164(raw, country) != null;
    }
}