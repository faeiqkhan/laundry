import wwebjs from "whatsapp-web.js";
import QRCode from "qrcode";

const { Client, LocalAuth } = wwebjs;
import { config } from "../config.js";
import { logger } from "../logger.js";
import * as session from "../session.js";
import { State } from "../session.js";

let client = null;

function buildPuppeteerOptions() {
  const options = {
    headless: config.headless,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  };
  if (config.puppeteerExecutablePath) {
    options.executablePath = config.puppeteerExecutablePath;
  }
  return options;
}

function buildClient() {
  const authStrategy = new LocalAuth({
    dataPath: config.sessionPath,
    clientId: "clothncare",
  });
  return new Client({
    authStrategy,
    puppeteer: buildPuppeteerOptions(),
    webVersionCache: { type: "local", path: config.webCachePath },
  });
}

function wireEvents(c) {
  c.on("qr", async (qr) => {
    try {
      const dataUrl = await QRCode.toDataURL(qr, { width: 240, margin: 1 });
      session.setQr(dataUrl);
      session.setStatus(State.QR_REQUIRED);
      logger.info("WhatsApp QR generated", { status: "QR_REQUIRED" });
    } catch (err) {
      logger.error("Failed to render WhatsApp QR", { error: err.message });
      session.setStatus(State.ERROR, "Failed to render QR code");
    }
  });

  c.on("authenticated", () => {
    session.clearQr();
    session.setStatus(State.AUTHENTICATED);
    logger.info("WhatsApp authenticated");
  });

  c.on("auth_failure", (msg) => {
    session.setStatus(State.AUTH_FAILURE, typeof msg === "string" ? msg : "Authentication failed");
    logger.error("WhatsApp authentication failure");
  });

  c.on("ready", () => {
    if (c.info && c.info.wid) {
      session.setBusinessNumber(c.info.wid.user);
    }
    session.clearQr();
    session.setStatus(State.READY);
    logger.info("WhatsApp ready", { businessNumber: session.snapshot().businessNumber });
  });

  c.on("disconnected", (reason) => {
    if (reason === "LOGGED_OUT") {
      session.setStatus(State.LOGGED_OUT, "Logged out");
      logger.warn("WhatsApp logged out", { reason });
    } else {
      session.setStatus(State.DISCONNECTED, reason || "Disconnected");
      logger.warn("WhatsApp disconnected", { reason });
    }
  });

  c.on("change_state", (stateChange) => {
    if (stateChange === "CONNECTED") {
      session.setStatus(State.CONNECTING);
    }
  });
}

export async function start() {
  if (session.isInitialized()) {
    return client;
  }
  logger.info("WhatsApp service starting", { sessionPath: config.sessionPath });

  client = buildClient();
  wireEvents(client);

  session.setInitialized(true);
  session.setStatus(State.CONNECTING, "Initializing WhatsApp Web");

  try {
    await client.initialize();
  } catch (err) {
    session.setStatus(
      State.ERROR,
      `Unable to launch browser: ${err && err.message ? err.message : String(err)}`,
    );
    logger.error("WhatsApp client initialize failed", { error: String(err && err.message || err) });
  }

  return client;
}

export async function stop() {
  if (client) {
    try {
      await client.destroy();
    } catch {
      // best effort
    }
    client = null;
  }
  session.setInitialized(false);
  session.setStatus(State.DISCONNECTED, "Service stopped");
}

export async function forceReconnect() {
  await stop();
  await start();
}

export async function logout() {
  if (client) {
    try {
      await client.logout();
    } catch {
      // ignore - some sessions are already invalid
    }
    try {
      await client.destroy();
    } catch {
      // best effort
    }
    client = null;
  }
  session.reset();
  session.setStatus(State.LOGGED_OUT, "Logged out");
}

export function getClient() {
  return client;
}