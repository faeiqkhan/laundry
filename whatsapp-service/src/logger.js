const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

const level = LEVELS[process.env.LOG_LEVEL || "info"] || LEVELS.info;

function ts() {
  return new Date().toISOString();
}

function log(sev, message, extra) {
  if ((LEVELS[sev] ?? LEVELS.info) < level) return;
  const entry = { ts: ts(), level: sev, msg: message };
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v !== undefined) entry[k] = v;
    }
  }
  const line = `[${entry.ts}] ${entry.level.toUpperCase()} ${entry.msg}`;
  const context = entry.data ?? entry.extra;
  // eslint-disable-next-line no-console
  console.log(context ? `${line} ${JSON.stringify(context)}` : line);
}

export const logger = {
  debug: (m, e) => log("debug", m, e),
  info: (m, e) => log("info", m, e),
  warn: (m, e) => log("warn", m, e),
  error: (m, e) => log("error", m, e),
};