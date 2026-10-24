import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { DB_VERSION, type DB, type Order } from "../types";
import { importCatalog } from "./catalogImport";
import { buildSeed } from "./seed";

/** Single-file JSON store. One in-memory copy per process (kept on globalThis so every route bundle shares it),
 *  writes are serialized and land atomically (temp file + rename). Swap this module for ApsaraDB/MySQL on Alibaba Cloud
 *  when traffic needs more than one server instance.
 *
 *  On Vercel the project folder is read-only and only /tmp is writable, and each server instance has its own /tmp, so
 *  data there lasts only as long as the instance — fine for a preview, not for real orders (use a database). */

const ON_VERCEL = !!process.env.VERCEL;
const DIR = process.env.DATA_DIR || (ON_VERCEL ? path.join(os.tmpdir(), "zx-ev") : path.join(process.cwd(), "data"));
const FILE = path.join(DIR, "db.json");
export const UPLOAD_DIR = path.join(DIR, "uploads");

type Store = { data: DB | null; loading: Promise<DB> | null; chain: Promise<unknown> };
const g = globalThis as typeof globalThis & { __zxStore?: Store };
const store: Store = (g.__zxStore ??= { data: null, loading: null, chain: Promise.resolve() });

let seq = 0;
let warned = false;
async function persist(db: DB) {
  try {
    await fs.mkdir(DIR, { recursive: true });
    const tmp = `${FILE}.${process.pid}.${++seq}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(db, null, 1), "utf8");
    await fs.rename(tmp, FILE);
  } catch (e) {
    // a read-only host must not take the whole site down: keep serving from memory
    const code = (e as NodeJS.ErrnoException).code;
    if (!["EROFS", "EACCES", "EPERM", "ENOTDIR"].includes(code ?? "")) throw e;
    if (!warned) {
      warned = true;
      console.warn(`[db] ${DIR} is not writable (${code}); running from memory only — changes last until this server restarts.`);
    }
  }
}

/** Without SESSION_SECRET, several Vercel instances would each invent their own key and sign each other out. */
function sharedSecret() {
  if (!ON_VERCEL || process.env.SESSION_SECRET) return null;
  const seed = `zx-ev-preview:${process.env.VERCEL_PROJECT_ID ?? ""}:${process.env.VERCEL_GIT_REPO_ID ?? ""}`;
  return crypto.createHash("sha256").update(seed).digest("base64url");
}

/** An early import read the range figure as the charging time (e.g. "90 h"). Fix those models in place, keep everything else. */
function repairCharging(db: DB): boolean {
  let changed = false;
  const fresh = new Map(importCatalog().map((m) => [m.slug, m.specs.charge]));
  for (const m of db.models) {
    const right = fresh.get(m.slug);
    if (right && m.specs.charge === m.specs.range && m.specs.charge !== right) {
      m.specs.charge = right;
      changed = true;
    }
  }
  return changed;
}

function load(): Promise<DB> {
  if (store.data) return Promise.resolve(store.data);
  // concurrent first requests share one read (or one seed)
  store.loading ??= (async () => {
    let current: DB | null = null;
    try {
      current = JSON.parse(await fs.readFile(FILE, "utf8")) as DB;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
    if (current && current.version !== DB_VERSION) {
      // older demo data predates the real factory catalogue: keep a copy, start fresh
      await fs.copyFile(FILE, path.join(DIR, `db.v${current.version}.backup.json`));
      current = null;
    }
    if (!current) {
      current = buildSeed();
      await persist(current);
    } else if (repairCharging(current)) {
      await persist(current);
    }
    const shared = sharedSecret();
    if (shared) current.secret = shared;
    store.data = current;
    return store.data!;
  })().finally(() => {
    store.loading = null;
  });
  return store.loading;
}

/** Read-only snapshot. Never mutate the returned object — use `mutate`. */
export async function getDb(): Promise<DB> {
  await store.chain;
  const db = await load();
  if (hasStale(db)) await mutate(() => undefined); // mutate runs the sweep
  return store.data!;
}

export function mutate<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
  const run = store.chain.then(async () => {
    const draft = structuredClone(await load());
    sweep(draft);
    const out = await fn(draft);
    await persist(draft);
    store.data = draft;
    return out;
  });
  store.chain = run.catch(() => undefined);
  return run;
}

const hasStale = (db: DB) => db.orders.some((o) => o.status === "pending_payment" && new Date(o.lockExpiresAt).getTime() < Date.now());

/** Unpaid orders past their lock window expire and hand their reserved unit back to factory stock. */
function sweep(db: DB) {
  const now = Date.now();
  for (const o of db.orders) {
    if (o.status === "pending_payment" && new Date(o.lockExpiresAt).getTime() < now) expireOrder(db, o, "system");
  }
}

export function releaseUnit(db: DB, o: Order) {
  db.factoryStock[o.model] = (db.factoryStock[o.model] ?? 0) + 1;
}

export function expireOrder(db: DB, o: Order, by: string) {
  o.status = "expired";
  o.history.push({ at: new Date().toISOString(), by, action: "order.expired" });
  releaseUnit(db, o);
}
