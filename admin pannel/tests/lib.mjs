// Shared helpers for the admin QA scripts. Run any script with: node "admin pannel/tests/<name>.mjs" [baseUrl]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, "..", "..");
export const DB_PATH = process.env.DB_PATH || path.join(ROOT, "admin pannel", "data", "db.json");
export const BASE = process.argv[2] || process.env.BASE || "http://localhost:3001";
export const readDb = () => JSON.parse(fs.readFileSync(DB_PATH, "utf8"));

let ipN = Math.floor(Math.random() * 2_000_000); // random start: rate limits remember addresses between runs
/** One browser-like session: cookie jar + JSON helpers. Each client gets its own fake IP so rate limits never bite the tests. */
export function client(base = BASE) {
  const jar = new Map();
  ipN += 1;
  const ip = `10.${(ipN >> 16) & 255}.${(ipN >> 8) & 255}.${ipN & 255}`;
  const cookie = () => [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
  async function req(p, opts = {}) {
    const r = await fetch(base + p, { ...opts, headers: { "x-forwarded-for": ip, ...(opts.headers ?? {}), cookie: cookie() }, redirect: "manual" });
    for (const c of r.headers.getSetCookie?.() ?? []) {
      const [kv] = c.split(";");
      const i = kv.indexOf("=");
      const k = kv.slice(0, i);
      const v = kv.slice(i + 1);
      if (/max-age=0|expires=thu, 01 jan 1970/i.test(c)) jar.delete(k);
      else jar.set(k, v);
    }
    return r;
  }
  const send = async (method, p, body) => {
    const r = await req(p, { method, headers: { "content-type": "application/json", origin: base }, body: body === undefined ? undefined : JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    return { status: r.status, ...j };
  };
  return {
    req,
    get: async (p) => {
      const r = await req(p);
      return { status: r.status, text: await r.text(), headers: r.headers };
    },
    post: (p, b) => send("POST", p, b),
    put: (p, b) => send("PUT", p, b),
    patch: (p, b) => send("PATCH", p, b),
    del: (p, b) => send("DELETE", p, b),
    loginAdmin: (username, password) => send("POST", "/api/admin/login", { username, password }),
    loginUser: (phone, password) => send("POST", "/api/auth/login", { phone, password }),
    jar,
  };
}

export function suite(name) {
  const rows = [];
  return {
    check(label, ok, detail = "") {
      rows.push({ label, ok: !!ok, detail: ok ? "" : String(detail) });
    },
    done() {
      const bad = rows.filter((r) => !r.ok);
      console.log(`\n== ${name}: ${rows.length - bad.length}/${rows.length} passed`);
      for (const r of bad) console.log(`FAIL  ${r.label}${r.detail ? `  → ${r.detail}` : ""}`);
      return { name, rows, failed: bad.length };
    },
    rows,
  };
}

export const ADMINS = { super: ["admin", "Admin@2026"], operator: ["operator", "Operator@2026"], dealer: ["dealer.lahore", "Dealer@2026"] };

/** The sandbox test values every payment suite uses (see docs/PAYMENT-TEST.md). */
export const TEST = { card: "4242424242424242", declined: "4000000000000002", noFunds: "4000000000009995", mastercard: "5555555555554444", paypak: "2205000000000009", wallet: "03001234567", walletEmpty: "03001230000", walletOff: "03001239999", otp: "123456" };
const year2 = String(new Date().getFullYear() + 3).slice(2);
export const CARD_FORM = { number: TEST.card, expiry: `12/${year2}`, cvv: "123", name: "QA Tester" };

/** Pays for an order (or a whole checkout group) the way a customer does: start an attempt, card form, 3-D Secure code. Returns the last API answer plus the attempt id. */
export async function payOrder(c, target, opts = {}) {
  const { method = "card", mode = "advance" } = opts;
  const start = await c.post("/api/pay/start", typeof target === "string" ? { orderId: target, method, mode } : target);
  if (!start.ok) return { ...start, step: "start" };
  const id = start.id;
  if (method === "card") {
    const a = await c.post(`/api/pay/${id}/card`, CARD_FORM);
    if (!a.ok) return { ...a, id, step: "card" };
  } else if (method === "jazzcash" || method === "easypaisa") {
    const a = await c.post(`/api/pay/${id}/wallet`, { number: TEST.wallet });
    if (!a.ok) return { ...a, id, step: "wallet" };
  } else return { ok: true, id, step: "bank" };
  const o = await c.post(`/api/pay/${id}/otp`, { code: TEST.otp });
  return { ...o, id, step: "otp" };
}
