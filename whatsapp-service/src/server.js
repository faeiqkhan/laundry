import express from "express";
import { config } from "./config.js";
import { logger } from "./logger.js";
import whatsappRouter from "./routes/whatsapp.js";
import * as clientModule from "./whatsapp/client.js";
import * as session from "./session.js";

const app = express();

app.use(express.json({ limit: "25mb" }));

// Simple bearer-style internal token protection. The Spring Boot backend sends
// `X-Internal-Token` matching WHATSAPP_SERVICE_TOKEN.
app.use("/api", (req, res, next) => {
  if (config.serviceToken && req.header("X-Internal-Token") !== config.serviceToken) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  return next();
});

app.get("/health", (_req, res) => {
  return res.json({ status: "ok", service: "clothncare-whatsapp-service" });
});

app.use("/api/whatsapp", whatsappRouter);

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  logger.error("Unhandled request error", { error: err.message });
  return res.status(500).json({ success: false, message: "Internal WhatsApp service error" });
});

async function shutdown(signal) {
  logger.info("WhatsApp service shutting down", { signal });
  try {
    await clientModule.stop();
  } finally {
    process.exit(0);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

const server = app.listen(config.port, config.host, async () => {
  logger.info("WhatsApp service listening", { host: config.host, port: config.port });

  // Auto-initialize on boot so a persisted session reconnects without a QR scan.
  // If the browser is unavailable the service still serves /health and /status.
  const started = await clientModule.start();
  if (!started && !session.isInitialized()) {
    logger.warn("WhatsApp client did not start; check the browser/session configuration");
  }
});

export { server };