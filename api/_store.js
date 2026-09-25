/* Where the live table keeps its rooms.
 *
 * On the deployed site: Upstash Redis, reached over its REST API with plain
 * fetch, so the function has no dependencies. Vercel's Upstash integration
 * sets KV_REST_API_URL and KV_REST_API_TOKEN when you connect the database to
 * the project; a database made on upstash.com gives UPSTASH_REDIS_REST_URL and
 * UPSTASH_REDIS_REST_TOKEN instead. Either pair works.
 *
 * For tests and local runs: TT_SYNC_MEMORY=1 keeps rooms in this process.
 * With neither, store() returns null and the API says sync isn't set up.
 *
 * Files in api/ that start with an underscore are not deployed as functions.
 */
"use strict";

function upstash(url, token) {
  url = url.replace(/\/+$/, "");
  async function run(cmd) {
    const r = await fetch(url, {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify(cmd)
    });
    const j = await r.json().catch(() => ({ error: "bad reply from the database" }));
    if (!r.ok || j.error) throw new Error(j.error || "database error " + r.status);
    return j.result;
  }
  return {
    kind: "upstash",
    hget: (k, f) => run(["HGET", k, f]),
    hgetall: async k => {
      const flat = await run(["HGETALL", k]) || [];
      if (!flat.length) return null;
      const o = {};
      for (let i = 0; i < flat.length; i += 2) o[flat[i]] = flat[i + 1];
      return o;
    },
    hset: (k, obj) => {
      const args = ["HSET", k];
      Object.keys(obj).forEach(f => args.push(f, obj[f]));
      return run(args);
    },
    hincrby: (k, f, n) => run(["HINCRBY", k, f, String(n)]),
    hlen: k => run(["HLEN", k]),
    hdel: (k, ...f) => run(["HDEL", k, ...f]),
    expire: (k, s) => run(["EXPIRE", k, String(s)]),
    del: k => run(["DEL", k])
  };
}

// One process's worth of rooms, the same calls as above.
function memory() {
  const data = new Map(), until = new Map();
  const live = k => {
    if (until.has(k) && until.get(k) < Date.now()) { data.delete(k); until.delete(k); }
    return data.get(k) || null;
  };
  return {
    kind: "memory",
    hget: async (k, f) => { const h = live(k); return h && f in h ? h[f] : null; },
    hgetall: async k => { const h = live(k); return h ? Object.assign({}, h) : null; },
    hset: async (k, obj) => { const h = live(k) || {}; Object.assign(h, obj); data.set(k, h); return 1; },
    hincrby: async (k, f, n) => {
      const h = live(k) || {};
      h[f] = String((parseInt(h[f], 10) || 0) + n);
      data.set(k, h);
      return parseInt(h[f], 10);
    },
    hlen: async k => { const h = live(k); return h ? Object.keys(h).length : 0; },
    hdel: async (k, ...f) => { const h = live(k); if (!h) return 0; let n = 0; f.forEach(x => { if (x in h) { delete h[x]; n++; } }); return n; },
    expire: async (k, s) => { if (data.has(k)) until.set(k, Date.now() + s * 1000); return 1; },
    del: async k => { data.delete(k); until.delete(k); return 1; }
  };
}

let cached;
function store() {
  if (cached !== undefined) return cached;
  const env = process.env;
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  cached = url && token ? upstash(url, token) : env.TT_SYNC_MEMORY === "1" ? memory() : null;
  return cached;
}

module.exports = { store, memory, upstash };
