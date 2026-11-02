import { DEFAULT_ROLES, ALL_PERMS } from "../perms";
import { DEMO_ADMINS, DEMO_CUSTOMERS } from "../demo";
import { DB_VERSION, type CityKey, type DB } from "../types";
import { hashPassword, randomId } from "./crypto";
import { defaultCompany, defaultSocial, defaultTemplates, defaultTestDrive, solarGroup, v3Collections } from "./defaultsV3";

/** Modules added after the first version 3 release: built-in roles pick up their default permissions for them once. */
const LATE_MODULES = ["testdrives", "partners"];

/** Idempotent top-up: adds anything newer code expects that an existing database does not have yet. Never removes or overwrites.
 *  Runs on every start. Returns true when something was added (so the caller saves). */
export function ensure(db: DB): boolean {
  let changed = false;
  const x = db as DB & Record<string, unknown>;
  const add = <K extends keyof DB>(key: K, value: DB[K]) => {
    if (x[key] === undefined) {
      (x as Record<string, unknown>)[key] = value;
      changed = true;
    }
  };
  const fresh = v3Collections();
  add("testDrives", fresh.testDrives);
  add("partners", fresh.partners);

  // roles: keep what the admins edited, add built-in roles that are missing, and give them the new modules once
  for (const def of DEFAULT_ROLES) {
    const have = db.roles.find((r) => r.id === def.id);
    if (!have) {
      db.roles.push(structuredClone(def));
      changed = true;
      continue;
    }
    if (def.id === "super") {
      if (have.perms.length !== ALL_PERMS.length) (have.perms = [...ALL_PERMS]), (changed = true);
      continue;
    }
    for (const mod of LATE_MODULES) {
      if ((db.settings.seenModules ?? []).includes(mod)) continue; // already offered once: respect later edits
      const defPerms = def.perms.filter((p) => p.startsWith(`${mod}.`));
      if (defPerms.length && !have.perms.some((p) => p.startsWith(`${mod}.`))) {
        have.perms.push(...defPerms);
        changed = true;
      }
    }
  }
  const seen = db.settings.seenModules ?? [];
  if (LATE_MODULES.some((m) => !seen.includes(m))) {
    db.settings.seenModules = [...new Set([...seen, ...LATE_MODULES])];
    changed = true;
  }

  // dealer-scoped roles never see the site-wide chat inbox: it holds every customer's conversation
  for (const r of db.roles) {
    if (r.scope === "dealer" && r.perms.some((p) => p.startsWith("chat."))) {
      r.perms = r.perms.filter((p) => !p.startsWith("chat."));
      changed = true;
    }
  }
  // solar add-on
  if (!db.options.some((o) => o.key === "solar")) {
    db.options.push(solarGroup());
    changed = true;
  }
  // settings
  if (!db.settings.company) (db.settings.company = defaultCompany()), (changed = true);
  else if (db.settings.company.whatsapp === undefined) {
    const d = defaultCompany();
    db.settings.company = { ...d, ...db.settings.company, supportEmail: db.settings.company.supportEmail ?? d.supportEmail, whatsapp: d.whatsapp, hours: d.hours };
    changed = true;
  }
  if (!db.settings.social) (db.settings.social = defaultSocial()), (changed = true);
  // test drive rules for every store
  for (const d of db.dealers) {
    if (!d.testDrive) {
      d.testDrive = defaultTestDrive();
      changed = true;
    }
  }
  // message templates added later (by id, so edited ones stay as they are)
  for (const t of defaultTemplates()) {
    if (!db.templates.some((x) => x.id === t.id)) {
      db.templates.push(t);
      changed = true;
    }
  }
  // demo sign-ins: one per role and a few customers (existing accounts are never touched)
  for (const a of DEMO_ADMINS) {
    if (db.admins.some((x) => x.username === a.username)) continue;
    if (a.dealerId && !db.dealers.some((d) => d.id === a.dealerId)) continue;
    db.admins.push({ id: randomId(8), username: a.username, name: a.name, role: a.role, dealerId: a.dealerId, passwordHash: hashPassword(a.password), createdAt: new Date().toISOString(), disabled: false, lastLoginAt: null });
    changed = true;
  }
  for (const c of DEMO_CUSTOMERS) {
    if (db.users.some((u) => u.phone === c.phone)) continue;
    db.users.push({ id: randomId(8), name: c.name, phone: c.phone, email: c.email, city: c.city as CityKey, passwordHash: hashPassword(c.password), createdAt: new Date(Date.now() - 20 * 86400000).toISOString(), disabled: false, wishlist: [] });
    changed = true;
  }
  return changed;
}

/** Upgrades an older database file in place. Never drops data: it only adds what the new version needs.
 *  Every step must be safe to run twice. */
export function migrate(raw: DB): DB {
  const db = raw as DB & Record<string, unknown>;
  if (db.version < 3) {
    const add = v3Collections();
    for (const [k, v] of Object.entries(add)) if (db[k] === undefined) db[k] = v;
    db.settings.company ??= { name: "Evolta Bikes Zhongxiang", email: "info@evoltabikes.pk", phone: "+92 21 3456 1200", address: { en: "Karachi, Pakistan", ur: "کراچی، پاکستان" } };
    db.settings.sitemapEnabled ??= true;
    db.settings.maintenance ??= false;
    db.settings.robotsExtra ??= "";
    for (const m of db.models) {
      m.brand ??= "evolta";
      m.views ??= 0;
      m.related ??= [];
      m.seo ??= null;
    }
    for (const u of db.users) u.wishlist ??= [];
    for (const o of db.orders) {
      o.discount ??= 0;
      o.couponCode ??= null;
      o.shipping ??= 0;
      o.notes ??= [];
    }
  }
  db.version = DB_VERSION;
  ensure(db);
  return db;
}
