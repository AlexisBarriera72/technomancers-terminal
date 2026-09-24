#!/usr/bin/env node
/* The site plus its live-table API on this machine, the way Vercel serves
 * them: static files from the repo and api/room.js at /api/room. Rooms live
 * in memory, so nothing needs setting up and nothing outlives the process.
 *
 *   npm run serve            http://localhost:8787
 *   npm run serve -- 9000    another port
 *
 * Open it on your phone or iPad on the same Wi-Fi at http://<this computer's
 * address>:8787 to try a live table before deploying. The tests use it too.
 */
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".css": "text/css", ".md": "text/markdown"
};

function start(port) {
  process.env.TT_SYNC_MEMORY = process.env.TT_SYNC_MEMORY || "1";
  const room = require("../api/room");
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://x");
    if (url.pathname === "/api/room") return room(req, res);
    let file = path.normalize(path.join(ROOT, decodeURIComponent(url.pathname)));
    if (!file.startsWith(ROOT) || /[\\/]\.|node_modules/.test(path.relative(ROOT, file))) {
      res.statusCode = 404; return res.end("not found");
    }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    fs.readFile(file, (err, buf) => {
      if (err) { res.statusCode = 404; return res.end("not found"); }
      res.setHeader("Content-Type", TYPES[path.extname(file)] || "application/octet-stream");
      res.setHeader("Cache-Control", "no-store");
      res.end(buf);
    });
  });
  return new Promise(ok => server.listen(port, () => ok(server)));
}

module.exports = { start };

if (require.main === module) {
  const port = +process.argv[2] || 8787;
  start(port).then(() => console.log("Technomancer's Terminal with a live table on http://localhost:" + port));
}
