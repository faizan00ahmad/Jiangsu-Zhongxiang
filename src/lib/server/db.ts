import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { DB_VERSION, type DB, type Order } from "../types";
import { importCatalog } from "./catalogImport";
import { ensure, migrate } from "./migrate";
import { notify } from "./notify";
import { ADMIN_HOME, BACKUP_DIR, DATA_DIR, DB_FILE, EXPORT_DIR, LEGACY_DB_FILE, ON_VERCEL, OUTBOX_DIR, UPLOAD_DIR } from "./paths";
import { buildSeed } from "./seed";

/** Single-file JSON store. One in-memory copy per process (kept on globalThis so every route bundle shares it),
 *  writes are serialized and land atomically (temp file + rename). Swap this module for ApsaraDB/MySQL on Alibaba Cloud
 *  when traffic needs more than one server instance.
 *
 *  On Vercel the project folder is read-only and only /tmp is writable, and each server instance has its own /tmp, so
 *  data there lasts only as long as the instance — fine for a preview, not for real orders (use a database). */

const DIR = DATA_DIR;
const FILE = DB_FILE;
const LEGACY_FILE = LEGACY_DB_FILE;
export { ADMIN_HOME, BACKUP_DIR, EXPORT_DIR, UPLOAD_DIR, OUTBOX_DIR };

type Store = { data: DB | null; loading: Promise<DB> | null; chain: Promise<unknown> };
const g = globalThis as typeof globalThis & { __zxStore?: Store };
const store: Store = (g.__zxStore ??= { data: null, loading: null, chain: Promise.resolve() });

let seq = 0;
let warned = false;
let snapshotDay = "";
async function persist(db: DB) {
  try {
    await fs.mkdir(DIR, { recursive: true });
    const tmp = `${FILE}.${process.pid}.${++seq}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(db, null, 1), "utf8");
    await fs.rename(tmp, FILE);
    await dailySnapshot(db);
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

const stamp = () => new Date().toISOString().replace(/[:.]/g, "-");

/** One snapshot per day (kept for 14 days). Failure to snapshot never blocks a save. */
async function dailySnapshot(db: DB) {
  const day = new Date().toISOString().slice(0, 10);
  if (snapshotDay === day) return;
  snapshotDay = day;
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    await fs.writeFile(path.join(BACKUP_DIR, `daily-${day}.json`), JSON.stringify(db), "utf8");
    const old = (await fs.readdir(BACKUP_DIR)).filter((f) => f.startsWith("daily-")).sort().slice(0, -14);
    await Promise.all(old.map((f) => fs.unlink(path.join(BACKUP_DIR, f))));
  } catch {
    // read-only host: skip
  }
}

export type BackupInfo = { name: string; size: number; at: string; kind: "daily" | "manual" | "migration" | "restore" };
const BACKUP_NAME = /^[\w.-]{1,80}\.json$/;

export async function listBackups(): Promise<BackupInfo[]> {
  try {
    const names = (await fs.readdir(BACKUP_DIR)).filter((f) => BACKUP_NAME.test(f));
    const infos = await Promise.all(
      names.map(async (name) => {
        const s = await fs.stat(path.join(BACKUP_DIR, name));
        const kind = name.startsWith("daily-") ? "daily" : name.startsWith("migration-") ? "migration" : name.startsWith("restore-") ? "restore" : "manual";
        return { name, size: s.size, at: s.mtime.toISOString(), kind } as BackupInfo;
      }),
    );
    return infos.sort((a, b) => b.at.localeCompare(a.at));
  } catch {
    return [];
  }
}

/** Copies the live database into backups/. Returns the file name. */
async function writeBackup(db: DB, label: "manual" | "migration" | "restore") {
  await fs.mkdir(BACKUP_DIR, { recursive: true });
  const name = `${label}-${stamp()}.json`;
  await fs.writeFile(path.join(BACKUP_DIR, name), JSON.stringify(db), "utf8");
  return name;
}

export async function backupNow(label: "manual" | "migration" | "restore" = "manual"): Promise<string> {
  await store.chain;
  return writeBackup(await load(), label);
}

export async function readBackupFile(name: string): Promise<Buffer | null> {
  if (!BACKUP_NAME.test(name)) return null;
  try {
    return await fs.readFile(path.join(BACKUP_DIR, name));
  } catch {
    return null;
  }
}

/** Replaces the live database with a backup (after saving a copy of what is live now). */
export async function restoreBackup(name: string): Promise<"ok" | "not_found" | "invalid"> {
  const buf = await readBackupFile(name);
  if (!buf) return "not_found";
  let next: DB;
  try {
    next = JSON.parse(buf.toString("utf8")) as DB;
    if (!next || typeof next !== "object" || !Array.isArray(next.models) || !Array.isArray(next.orders)) return "invalid";
    if (next.version < DB_VERSION) next = migrate(next);
  } catch {
    return "invalid";
  }
  const run = store.chain.then(async () => {
    const live = await load();
    await writeBackup(live, "restore");
    next.secret = live.secret; // keep sessions valid
    store.data = next;
    await persist(next);
  });
  store.chain = run.catch(() => undefined);
  await run;
  return "ok";
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
    for (const file of [FILE, LEGACY_FILE]) {
      // the legacy ./data/db.json is where earlier builds kept everything: carry it over into the admin folder
      if (current) break;
      try {
        current = JSON.parse(await fs.readFile(file, "utf8")) as DB;
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
      }
    }
    if (current && current.version < 3 && current.version >= 2) {
      // version 2 → 3 keeps all data: copy first, then add the new collections
      try {
        await writeBackup(current, "migration");
      } catch {
        // read-only host: carry on without the copy
      }
      current = migrate(current);
      await persist(current);
    } else if (current && current.version < 2) {
      // version 1 predates the real factory catalogue and cannot be upgraded: keep a copy, start fresh
      try {
        await writeBackup(current, "migration");
      } catch {
        // read-only host
      }
      current = null;
    }
    if (!current) {
      current = buildSeed();
      await persist(current);
    } else if (repairCharging(current) || ensure(current)) {
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
  notify(db, "order.expired", { name: o.contact.name, phone: o.contact.phone, email: db.users.find((u) => u.id === o.userId)?.email }, { order: o.id, model: o.modelName }, o.id);
}
