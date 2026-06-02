#!/usr/bin/env node
/**
 * Local debug log collector for debug-mode skill.
 * Accepts POST /debug from browser & server runtimes; appends NDJSON to .claude/debug.log
 *
 * Usage:
 *   node debug-server.js [port] [projectRoot]
 *   DEBUG_SERVER_PORT=3847 DEBUG_PROJECT_ROOT=/path/to/proj node debug-server.js
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = parseInt(
  process.argv[2] || process.env.DEBUG_SERVER_PORT || "3847",
  10
);
const PROJECT_ROOT = path.resolve(
  process.argv[3] || process.env.DEBUG_PROJECT_ROOT || process.cwd()
);
const LOG_DIR = path.join(PROJECT_ROOT, ".claude");
const LOG_FILE = path.join(LOG_DIR, "debug.log");
const PID_FILE = path.join(LOG_DIR, "debug-server.pid");
const DEFAULT_PORT = 3847;

function ensureLogDir() {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function appendLog(entry) {
  ensureLogDir();
  const line =
    typeof entry === "string" ? entry : JSON.stringify(entry);
  const normalized = line.endsWith("\n") ? line : `${line}\n`;
  fs.appendFileSync(LOG_FILE, normalized, "utf8");
}

function clearLog() {
  ensureLogDir();
  fs.writeFileSync(LOG_FILE, "", "utf8");
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function send(res, status, body) {
  const payload = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(payload);
}

function corsPreflight(res) {
  res.writeHead(204, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  });
  res.end();
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://127.0.0.1:${PORT}`);

  if (req.method === "OPTIONS") {
    corsPreflight(res);
    return;
  }

  try {
    if (req.method === "GET" && url.pathname === "/health") {
      send(res, 200, {
        ok: true,
        port: PORT,
        projectRoot: PROJECT_ROOT,
        logFile: LOG_FILE,
        pid: process.pid,
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/clear") {
      clearLog();
      send(res, 200, { ok: true, cleared: LOG_FILE });
      return;
    }

    if (req.method === "POST" && url.pathname === "/debug") {
      const body = await readBody(req);
      const ts = body.ts || new Date().toISOString();
      const hypothesis = body.hypothesis || body.h || "";
      const message = body.message || body.msg || "";
      const hTag =
        hypothesis && !String(hypothesis).startsWith("H")
          ? `H${hypothesis}`
          : hypothesis;
      const prefix = hTag ? `[DEBUG ${hTag}]` : "[DEBUG]";
      const line = {
        ts,
        hypothesis: hTag || null,
        message: message ? `${prefix} ${message}` : prefix,
        data: body.data ?? body.payload ?? null,
        location: body.location || body.loc || null,
        sessionId: body.sessionId || null,
        runId: body.runId || null,
      };
      appendLog(line);
      send(res, 200, { ok: true });
      return;
    }

    send(res, 404, { ok: false, error: "not_found" });
  } catch (err) {
    send(res, 400, { ok: false, error: String(err.message || err) });
  }
});

function writePidFile() {
  ensureLogDir();
  fs.writeFileSync(
    PID_FILE,
    JSON.stringify({ pid: process.pid, port: PORT, projectRoot: PROJECT_ROOT }),
    "utf8"
  );
}

function removePidFile() {
  try {
    fs.unlinkSync(PID_FILE);
  } catch {
    /* ignore */
  }
}

server.listen(PORT, "127.0.0.1", () => {
  writePidFile();
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      event: "debug-server-started",
      port: PORT,
      projectRoot: PROJECT_ROOT,
      logFile: LOG_FILE,
      health: `http://127.0.0.1:${PORT}/health`,
    })
  );
});

function shutdown() {
  removePidFile();
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

module.exports = { PORT: DEFAULT_PORT, LOG_FILE, appendLog, clearLog };
