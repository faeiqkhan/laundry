// Centralized phone normalization for the WhatsApp service.
// Accepts +91XXXXXXXXXX, 91XXXXXXXXXX, 0XXXXXXXXX, XXXXXXXXXX.
// The default country (IN = 91) is configurable via WHATSAPP_DEFAULT_COUNTRY.

const COUNTRY_CODES = { IN: "91", US: "1", AE: "971", SA: "966", GB: "44", PK: "92", BD: "880", LK: "94", NP: "977" };

function dialCode(country) {
  return COUNTRY_CODES[(country || "").toUpperCase()] || COUNTRY_CODES.IN;
}

/**
 * Normalize a raw number to E.164 digits without '+', e.g. "9198XXXXXXXX".
 * Returns null when the number cannot be safely interpreted.
 */
export function toE164(raw, country) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");
  if (!digits) return null;

  const cc = dialCode(country);

  if (digits.length === 10) {
    return cc + digits;
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return cc + digits.slice(1);
  }
  if (digits.length === 12 && digits.startsWith(cc)) {
    return digits;
  }
  if (digits.length === 10 + cc.length && digits.startsWith(cc)) {
    return digits;
  }
  return null;
}

/**
 * WhatsApp contact id ("_serialized") for a number, e.g. "9198XXXXXXXX@c.us".
 * Returns null when invalid.
 */
export function toChatId(raw, country) {
  const e164 = toE164(raw, country);
  if (!e164) return null;
  return `${e164}@c.us`;
}

export function isValidForWhatsApp(raw, country) {
  return toE164(raw, country) !== null;
}