/* Offline shell.
 *
 * Without this the site cannot open on a tablet with no signal: vercel.json
 * serves "/" with must-revalidate, so a cold load needs the network. The game
 * is played in person, sometimes underground, so that isn't acceptable.
 *
 * Cache-first for the app's own files, because they only change when we deploy
 * and the deploy bumps CACHE. Anything else falls through to the network and is
 * never cached.
 *
 * Bump CACHE on every deploy that changes a file below.
 */
var CACHE = "ttb-v17";
var SHELL = [
  "./",
  "./index.html",
  "./campaigns.js",
  "./data.js",
  "./expansion.js",
  "./srd.js",
  "./es-ui.js",
  "./synergy.js",
  "./gm.js",
  "./app.js",
  "./manifest.json",
  "./icon.svg"
];

/* Install completely or not at all.
 *
 * Files are fetched individually so a failure can name what went missing, but
 * a partial shell is NOT treated as success: if anything failed we delete the
 * half-built cache and reject, so this worker never activates and the previous
 * complete one keeps serving. Getting this wrong is worse than having no
 * worker — a partial cache replaces a working one and leaves the tablet with
 * an HTML shell and no application, recoverable only with the network that
 * this file exists to do without.
 *
 * `cache: "reload"` forces a real network round trip per file, so a weak
 * connection is the expected trigger, not an edge case.
 */
self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) {
        return Promise.all(SHELL.map(function (url) {
          return c.add(new Request(url, { cache: "reload" }))
            .then(function () { return null; }, function () { return url; });
        }));
      })
      .then(function (results) {
        var missing = results.filter(Boolean);
        if (missing.length) {
          return caches["delete"](CACHE).then(function () {
            throw new Error("incomplete shell, keeping the previous cache: " + missing.join(", "));
          });
        }
        return self.skipWaiting();
      })
  );
});

/* Only reached once an install succeeded in full, so dropping older caches
   here is safe. */
self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (k) {
          return k === CACHE ? null : caches["delete"](k);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // fonts etc. — leave alone

  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (hit) {
      if (hit) {
        // Refresh in the background so the next load is current, but never
        // block on it: the point of this file is working with no network.
        e.waitUntil(
          fetch(req).then(function (res) {
            if (res && res.ok) return caches.open(CACHE).then(function (c) { return c.put(req, res); });
          })["catch"](function () {})
        );
        return hit;
      }
      return fetch(req).then(function (res) {
        if (res && res.ok && res.type === "basic") {
          var copy = res.clone();
          e.waitUntil(caches.open(CACHE).then(function (c) { return c.put(req, copy); }));
        }
        return res;
      })["catch"](function () {
        // A navigation with nothing cached: hand back the shell rather than
        // the browser's offline page.
        if (req.mode === "navigate") return caches.match("./index.html");
        return new Response("", { status: 504, statusText: "Offline" });
      });
    })
  );
});
