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
var CACHE = "ttb-v4";
var SHELL = [
  "./",
  "./index.html",
  "./campaigns.js",
  "./data.js",
  "./expansion.js",
  "./gm.js",
  "./app.js",
  "./manifest.json",
  "./icon.svg"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE)
      // addAll is all-or-nothing; one 404 would leave the site with no cache at
      // all, so each file is fetched on its own and a miss is survivable.
      .then(function (c) {
        return Promise.all(SHELL.map(function (url) {
          return c.add(new Request(url, { cache: "reload" }))["catch"](function () {});
        }));
      })
      .then(function () { return self.skipWaiting(); })
  );
});

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
