import fs from "node:fs";
import path from "node:path";
import wwebjs from "whatsapp-web.js";
import { config } from "../config.js";
import { logger } from "../logger.js";
import * as session from "../session.js";
import { State } from "../session.js";

const { MessageMedia } = wwebjs;

function requireReady() {
  const snapshot = session.snapshot();
  if (snapshot.status !== State.READY) {
    const message =
      snapshot.status === State.QR_REQUIRED || snapshot.status === State.AUTHENTICATED
        ? "WhatsApp is not connected yet - scan the QR code first."
        : "WhatsApp is currently disconnected.";
    logger.warn("Message not sent because WhatsApp is not ready", {
      status: snapshot.status,
    });
    return { ok: false, error: message };
  }
  return { ok: true };
}

async function resolveChatId(raw, country) {
  const { toE164 } = await import("../phone.js");
  const client = (await import("./client.js")).getClient();
  if (!client) return { ok: false, error: "WhatsApp client is not running" };

  const e164 = toE164(raw, country);
  if (!e164) {
    logger.warn("Message not sent because the phone number is invalid", { to: raw });
    return { ok: false, error: `Invalid phone number: ${raw}` };
  }

  const contact = await client.getNumberId(e164);
  if (!contact) {
    logger.warn("Message not sent because the number is not on WhatsApp", { to: e164 });
    return { ok: false, error: `Number ${e164} is not registered on WhatsApp` };
  }

  return { ok: true, chatId: contact._serialized || `${e164}@c.us` };
}

export async function sendText({ to, body, country = config.defaultCountry }) {
  const ready = requireReady();
  if (!ready.ok) return { ok: false, status: "FAILED", failureReason: ready.error };

  if (!body) return { ok: false, status: "FAILED", failureReason: "Message body is empty" };

  const target = await resolveChatId(to, country);
  if (!target.ok) return { ok: false, status: "FAILED", failureReason: target.error };

  const client = (await import("./client.js")).getClient();
  try {
    const sent = await client.sendMessage(target.chatId, body);
    if (sent === null) {
      const reason = "Message type is not supported by WhatsApp";
      logger.error("WhatsApp message send failed", { to: target.chatId, error: reason });
      return { ok: false, status: "FAILED", failureReason: reason };
    }
    const providerMessageId = sent && sent.id && sent.id._serialized ? sent.id._serialized : null;
    logger.info("WhatsApp message sent", { to: target.chatId, id: providerMessageId });
    return { ok: true, status: "SENT", providerMessageId };
  } catch (err) {
    const reason = err && err.message ? err.message : String(err);
    logger.error("WhatsApp message send failed", { to: target.chatId, error: reason });
    return { ok: false, status: "FAILED", failureReason: reason };
  }
}

export async function sendDocument({ to, body, filePath, filename, octetStream, country = config.defaultCountry }) {
  const ready = requireReady();
  if (!ready.ok) return { ok: false, status: "FAILED", failureReason: ready.error };

  const target = await resolveChatId(to, country);
  if (!target.ok) return { ok: false, status: "FAILED", failureReason: target.error };

  let media;
  if (filePath) {
    const abs = path.resolve(filePath);
    if (!fs.existsSync(abs)) {
      return { ok: false, status: "FAILED", failureReason: `Document not found: ${abs}` };
    }
    try {
      media = MessageMedia.fromFilePath(abs);
    } catch (err) {
      return { ok: false, status: "FAILED", failureReason: `Unable to read document: ${err.message}` };
    }
  } else {
    return { ok: false, status: "FAILED", failureReason: "No document provided" };
  }

  if (filename) media.filename = filename;

  const client = (await import("./client.js")).getClient();
  try {
    const options = {};
    if (body) options.caption = body;
    if (filename) options.filename = filename;
    const sent = await client.sendMessage(target.chatId, media, { ...options, ...(octetStream ? { sendMediaAsDocument: true } : {}) });
    if (sent === null) {
      const reason = "Message type is not supported by WhatsApp";
      logger.error("WhatsApp document send failed", { to: target.chatId, error: reason });
      return { ok: false, status: "FAILED", failureReason: reason };
    }
    const providerMessageId = sent && sent.id && sent.id._serialized ? sent.id._serialized : null;
    logger.info("WhatsApp document sent", { to: target.chatId, filename, id: providerMessageId });
    return { ok: true, status: "SENT", providerMessageId };
  } catch (err) {
    const reason = err && err.message ? err.message : String(err);
    logger.error("WhatsApp document send failed", { to: target.chatId, error: reason });
    return { ok: false, status: "FAILED", failureReason: reason };
  }
}

export function getStatus() {
  return session.snapshot();
}