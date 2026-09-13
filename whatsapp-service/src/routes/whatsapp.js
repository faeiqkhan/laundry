import { Router } from "express";
import * as clientModule from "../whatsapp/client.js";
import * as provider from "../whatsapp/provider.js";
import * as session from "../session.js";
import { logger } from "../logger.js";
import { isValidForWhatsApp, toE164 } from "../phone.js";
import { config } from "../config.js";

const router = Router();

function ok(res, data) {
  return res.json({ success: true, data });
}

function fail(res, statusCode, message) {
  return res.status(statusCode).json({ success: false, message });
}

router.get("/status", (_req, res) => {
  return ok(res, provider.getStatus());
});

router.get("/qr", (req, res) => {
  const snapshot = session.snapshot();
  if (snapshot.status === "QR_REQUIRED" && snapshot.qrDataUrl) {
    return ok(res, { qrDataUrl: snapshot.qrDataUrl });
  }
  return fail(res, 409, "No QR code available");
});

router.post("/connect", async (_req, res) => {
  try {
    const started = await clientModule.start();
    return ok(res, { status: session.snapshot().status, started: !!started });
  } catch (err) {
    logger.error("Connect failed", { error: err.message });
    return fail(res, 500, "Unable to start WhatsApp client");
  }
});

router.post("/reconnect", async (_req, res) => {
  try {
    await clientModule.forceReconnect();
    return ok(res, { status: session.snapshot().status });
  } catch (err) {
    logger.error("Reconnect failed", { error: err.message });
    return fail(res, 500, "Unable to reconnect WhatsApp client");
  }
});

router.post("/logout", async (_req, res) => {
  try {
    await clientModule.logout();
    logger.info("WhatsApp logged out by request");
    return ok(res, { status: session.snapshot().status });
  } catch (err) {
    logger.error("Logout failed", { error: err.message });
    return fail(res, 500, "Unable to logout WhatsApp client");
  }
});

router.post("/messages", async (req, res) => {
  const { to, body } = req.body || {};
  if (!to || !body) return fail(res, 400, "to and body are required");

  const result = await provider.sendText({ to, body, country: config.defaultCountry });
  if (!result.ok) return fail(res, 502, result.failureReason);

  return ok(res, { providerMessageId: result.providerMessageId, status: "SENT" });
});

router.post("/messages/document", async (req, res) => {
  const { to, body, filePath, filename } = req.body || {};
  if (!to || !filePath) return fail(res, 400, "to and filePath are required");

  const result = await provider.sendDocument({
    to,
    body,
    filePath,
    filename,
    country: config.defaultCountry,
    octetStream: true,
  });
  if (!result.ok) return fail(res, 502, result.failureReason);

  return ok(res, { providerMessageId: result.providerMessageId, status: "SENT" });
});

router.post("/messages/validate", (req, res) => {
  const { to } = req.body || {};
  const isValid = isValidForWhatsApp(to, config.defaultCountry);
  return ok(res, { valid: isValid, e164: isValid ? toE164(to, config.defaultCountry) : null });
});

export default router;