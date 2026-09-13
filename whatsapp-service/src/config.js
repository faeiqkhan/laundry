import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

export const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  host: process.env.HOST || "127.0.0.1",
  serviceToken: process.env.WHATSAPP_SERVICE_TOKEN || "",
  sessionPath: toAbs(process.env.WHATSAPP_SESSION_PATH || "./whatsapp-session"),
  webCachePath: toAbs(process.env.WHATSAPP_WEB_CACHE_PATH || "./whatsapp-web-cache"),
  puppeteerExecutablePath: process.env.WHATSAPP_PUPPETEER_EXECUTABLE_PATH || detectBrowser(),
  headless: (process.env.WHATSAPP_HEADLESS || "true").toLowerCase() !== "false",
  defaultCountry: process.env.WHATSAPP_DEFAULT_COUNTRY || "IN",
};

function toAbs(value) {
  if (path.isAbsolute(value)) return value;
  return path.join(root, value);
}

function detectBrowser() {
  if (process.platform !== "win32") return "";
  const local = process.env.LOCALAPPDATA || "";
  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    path.join(local, "Google", "Chrome", "Application", "chrome.exe"),
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || "";
}