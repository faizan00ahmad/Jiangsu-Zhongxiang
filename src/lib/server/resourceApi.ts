import { CITIES } from "../catalog";
import { RESOURCE, get, type Field, type Opt, type Resource } from "../admin/resources";
import type { AdminCtx, DB, L, Seo } from "../types";
import { audit, guard } from "./admin";
import { bust } from "./cache";
import { randomId } from "./crypto";
import { mutate } from "./db";
import { fail, ok, readJson } from "./http";
import { notify } from "./notify";

/** Generic create / update / delete for every collection described in `lib/admin/resources.ts`.
 *  The schema decides which keys are accepted and how they are cleaned; nothing else from the browser is ever stored. */

type Doc = Record<string, unknown>;
type Fail = { error: string };

const RESERVED_SLUGS = new Set(["admin", "api", "blog", "customize", "inventory", "tracking", "login", "register", "account", "orders", "quote", "checkout", "enquiry", "dealers", "p", "returns", "privacy", "terms", "sitemap.xml", "robots.txt", "_next"]);

/** Dropdown values for fields whose choices come from other collections. */
export function lookups(db: DB): Record<"models" | "cities" | "categories" | "brands", Opt[]> {
  return {
    models: db.models.map((m) => ({ value: m.slug, label: { zh: m.name, en: m.name } })),
    cities: Object.entries(CITIES).map(([k, c]) => ({ value: k, label: { zh: c.zh, en: c.en } })),
    categories: db.categories.map((c) => ({ value: c.slug, label: { zh: c.name.en, en: c.name.en } })),
    brands: db.brands.map((b) => ({ value: b.slug, label: { zh: b.name, en: b.name } })),
  };
}

const clip = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const isL = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const okImage = (s: string) => s === "" || /^\/(api\/files\/[\w.-]+|products\/[\w./-]+|hero\/[\w.-]+)$/.test(s);
const okDate = (s: string) => s === "" || !Number.isNaN(Date.parse(s));

function coerceLang(v: unknown, max: number): L {
  const o = isL(v) ? v : {};
  return { en: clip(o.en, max), ur: clip(o.ur, max) };
}
function coerceSeo(v: unknown): Seo {
  const o = isL(v) ? v : {};
  const image = clip(o.image, 300);
  return { title: coerceLang(o.title, 120), description: coerceLang(o.description, 300), image: okImage(image) && image ? image : null, noindex: o.noindex === true };
}

/** One field → its cleaned value, or an error code. `undefined` means "leave as is". */
function coerceField(f: Field, v: unknown, db: DB, res: Resource, selfId: string | null): { value: unknown } | Fail {
  const requiredEmpty = (empty: boolean) => (f.required && empty ? ({ error: "required" } as Fail) : null);
  const choices = (): string[] | null => {
    if (!f.options) return null;
    return typeof f.options === "string" ? lookups(db)[f.options].map((o) => o.value) : f.options.map((o) => o.value);
  };
  switch (f.type) {
    case "text":
    case "textarea": {
      const s = clip(v, f.maxLen ?? (f.type === "textarea" ? 3000 : 200));
      return requiredEmpty(!s) ?? { value: s };
    }
    case "slug": {
      const s = clip(v, f.maxLen ?? 60).toLowerCase();
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)) return { error: requiredEmpty(!s) ? "required" : "invalid_value" };
      if (res.key === "pages" && RESERVED_SLUGS.has(s)) return { error: "reserved" };
      const coll = db[res.coll as keyof DB] as unknown as Doc[];
      if (coll.some((d) => d[res.idField] !== selfId && d[f.key] === s)) return { error: "slug_taken" };
      return { value: s };
    }
    case "number": {
      const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
      if (!Number.isFinite(n)) return requiredEmpty(true) ?? { value: f.def ?? 0 };
      if ((f.min !== undefined && n < f.min) || (f.max !== undefined && n > f.max)) return { error: "invalid_value" };
      return { value: n };
    }
    case "bool":
      return { value: v === true };
    case "select": {
      const s = clip(v, 80);
      const list = choices();
      if (!s) return requiredEmpty(true) ?? { value: null };
      if (list && !list.includes(s)) return { error: "invalid_value" };
      return { value: s };
    }
    case "multiselect": {
      const arr = Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
      const list = choices();
      if (list && arr.some((x) => !list.includes(x))) return { error: "invalid_value" };
      return requiredEmpty(!arr.length) ?? { value: [...new Set(arr)] };
    }
    case "tags": {
      const arr = (Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : []).map((x) => clip(x, 30).toLowerCase()).filter(Boolean);
      return { value: [...new Set(arr)].slice(0, 12) };
    }
    case "lang":
    case "langarea": {
      const l = coerceLang(v, f.maxLen ?? 400);
      return requiredEmpty(!l.en) ?? { value: l };
    }
    case "markdown": {
      const l = coerceLang(v, 30000);
      return requiredEmpty(!l.en) ?? { value: l };
    }
    case "image": {
      const s = clip(v, 300);
      if (!okImage(s)) return { error: "invalid_value" };
      return { value: s || null };
    }
    case "datetime": {
      const s = clip(v, 40);
      if (!okDate(s)) return { error: "invalid_value" };
      return { value: s ? new Date(s).toISOString() : null };
    }
    case "color": {
      const s = clip(v, 9);
      return /^#[0-9a-fA-F]{3,8}$/.test(s) ? { value: s } : { error: "invalid_value" };
    }
    case "rgb": {
      const s = clip(v, 16).replace(/\s/g, "");
      return /^\d{1,3},\d{1,3},\d{1,3}$/.test(s) && s.split(",").every((x) => Number(x) <= 255) ? { value: s } : { error: "invalid_value" };
    }
    case "seo":
      return { value: coerceSeo(v) };
  }
}

/** Builds the document to store from the browser's input. On update only the keys that were sent are touched. */
export function coerceDoc(res: Resource, input: Doc, existing: Doc | null, db: DB): { doc: Doc } | Fail {
  const doc: Doc = existing ? { ...existing } : {};
  const selfId = existing ? String(existing[res.idField]) : null;
  for (const f of res.fields) {
    if (f.readOnly) continue;
    if (existing && !(f.key in input)) continue;
    if (existing && f.type === "slug" && res.key === "categories") continue; // keys are permanent: models point at them
    const raw = f.key in input ? input[f.key] : f.def;
    const r = coerceField(f, raw, db, res, selfId);
    if ("error" in r) return r;
    doc[f.key] = r.value;
  }
  return { doc };
}

/** Rules that go beyond field types. Return an error code to refuse. */
function rules(res: Resource, db: DB, doc: Doc, existing: Doc | null): string | null {
  switch (res.key) {
    case "coupons": {
      doc.code = String(doc.code ?? "").toUpperCase().replace(/[^A-Z0-9_-]/g, "");
      if (!doc.code) return "required";
      if (db.coupons.some((c) => c.id !== doc.id && c.code === doc.code)) return "slug_taken";
      if (doc.type === "percent" && Number(doc.value) > 100) return "invalid_value";
      return null;
    }
    case "currencies": {
      doc.code = String(doc.code ?? "").toUpperCase();
      if (!/^[A-Z]{3}$/.test(String(doc.code))) return "invalid_value";
      if (existing?.base) {
        doc.rate = 1;
        doc.enabled = true;
        doc.code = existing.code;
      }
      if (!existing && db.currencies.some((c) => c.code === doc.code)) return "slug_taken";
      doc.base = existing?.base === true;
      return null;
    }
    case "nav":
    case "banners":
      return /^(\/|https?:\/\/)/.test(String(doc.href ?? "")) ? null : "invalid_value";
    default:
      return null;
  }
}

const EXTRAS: Record<string, (doc: Doc, existing: Doc | null) => void> = {
  pages: (d) => (d.updatedAt = new Date().toISOString()),
  posts: (d, e) => {
    const now = new Date().toISOString();
    d.updatedAt = now;
    d.createdAt = e?.createdAt ?? now;
    d.views = e?.views ?? 0;
  },
  nav: (d, e) => (d.key = e?.key ?? null),
  banners: (d, e) => {
    if (e) return;
    d.category ??= null;
    d.model ??= null;
  },
  coupons: (d, e) => (d.used = e?.used ?? 0),
  categories: (d, e) => (d.id = e?.id ?? `cat-${String(d.slug)}`),
};

/** Why a record can't be removed, or null. */
function blocked(res: Resource, db: DB, doc: Doc): string | null {
  if (res.key === "currencies" && doc.base) return "base_currency";
  if (res.key === "categories" && db.models.some((m) => m.series === doc.slug)) return "in_use";
  if (res.key === "brands" && db.models.some((m) => m.brand === doc.slug)) return "in_use";
  return null;
}

const SUMMARY_KEYS = ["title", "name", "code", "label", "slug"];
const summary = (d: Doc) => {
  for (const k of SUMMARY_KEYS) {
    const v = d[k];
    if (typeof v === "string" && v) return v;
    if (isL(v) && typeof v.en === "string" && v.en) return v.en;
  }
  return String(d.id ?? "");
};

export const seq = (db: DB, res: Resource) => db[res.coll as keyof DB] as unknown as Doc[];

export async function resourceCreate(req: Request, key: string) {
  const res = RESOURCE[key];
  if (!res || !res.canCreate) return fail("not_found", 404);
  const g = await guard(`${res.module}.create`);
  if (g.res) return g.res;
  const body = await readJson<Doc>(req);
  if (!body) return fail("invalid_input");
  const out = await mutate((db) => {
    const r = coerceDoc(res, body, null, db);
    if ("error" in r) return r;
    const doc = r.doc;
    if (!(res.idField in doc) || res.idField === "id") doc.id = randomId(6);
    EXTRAS[res.key]?.(doc, null);
    const bad = rules(res, db, doc, null);
    if (bad) return { error: bad };
    seq(db, res).push(doc);
    audit(db, g.admin, "create", res.key, String(doc[res.idField]), summary(doc));
    return { doc };
  });
  if ("error" in out) return fail(out.error);
  bust(res.tags, res.paths);
  return ok({ id: out.doc[res.idField] as string });
}

export async function resourceUpdate(req: Request, key: string, id: string) {
  const res = RESOURCE[key];
  if (!res) return fail("not_found", 404);
  const g = await guard(`${res.module}.edit`);
  if (g.res) return g.res;
  const body = await readJson<Doc>(req);
  if (!body) return fail("invalid_input");
  const out = await mutate((db) => {
    const list = seq(db, res);
    const idx = list.findIndex((d) => String(d[res.idField]) === id);
    if (idx < 0) return { error: "not_found" };
    const before = list[idx];
    const r = coerceDoc(res, body, before, db);
    if ("error" in r) return r;
    const doc = r.doc;
    EXTRAS[res.key]?.(doc, before);
    const bad = rules(res, db, doc, before);
    if (bad) return { error: bad };
    list[idx] = doc;
    if (res.key === "partners" && before.status !== "approved" && doc.status === "approved") {
      notify(db, "partner.approved", { name: String(doc.name), email: String(doc.email) || null, phone: String(doc.phone) }, { type: String(doc.type), ref: String(doc.id) }, String(doc.id));
    }
    audit(db, g.admin, "update", res.key, id, summary(doc));
    return { doc };
  });
  if ("error" in out) return fail(out.error, out.error === "not_found" ? 404 : 400);
  bust(res.tags, res.paths);
  return ok();
}

async function removeMany(res: Resource, admin: AdminCtx, ids: string[]) {
  return mutate((db) => {
    const list = seq(db, res);
    let n = 0;
    for (const id of ids) {
      const idx = list.findIndex((d) => String(d[res.idField]) === id);
      if (idx < 0) continue;
      const bad = blocked(res, db, list[idx]);
      if (bad) return { error: bad, n };
      audit(db, admin, "delete", res.key, id, summary(list[idx]));
      list.splice(idx, 1);
      n++;
    }
    return { n };
  });
}

export async function resourceDelete(key: string, id: string) {
  const res = RESOURCE[key];
  if (!res || !res.canDelete) return fail("not_found", 404);
  const g = await guard(`${res.module}.delete`);
  if (g.res) return g.res;
  const out = await removeMany(res, g.admin, [id]);
  if ("error" in out && out.error) return fail(out.error, 409);
  if (!out.n) return fail("not_found", 404);
  bust(res.tags, res.paths);
  return ok();
}

/** Bulk actions from the table: delete, enable, disable (or set one select field such as status). */
export async function resourceBulk(req: Request, key: string) {
  const res = RESOURCE[key];
  if (!res) return fail("not_found", 404);
  const b = await readJson<{ action?: string; ids?: unknown; field?: string; value?: unknown }>(req);
  const ids = Array.isArray(b?.ids) ? b.ids.filter((x): x is string => typeof x === "string").slice(0, 500) : [];
  if (!b || !ids.length) return fail("invalid_input");
  if (b.action === "delete") {
    if (!res.canDelete) return fail("forbidden", 403);
    const g = await guard(`${res.module}.delete`);
    if (g.res) return g.res;
    const out = await removeMany(res, g.admin, ids);
    if ("error" in out && out.error) return fail(out.error, 409);
    bust(res.tags, res.paths);
    return ok({ n: out.n });
  }
  const g = await guard(`${res.module}.edit`);
  if (g.res) return g.res;
  const field = b.action === "set" ? res.fields.find((f) => f.key === b.field && !f.readOnly && (f.type === "select" || f.type === "bool")) : res.fields.find((f) => f.key === "enabled");
  if (!field) return fail("invalid_input");
  const value = b.action === "enable" ? true : b.action === "disable" ? false : b.value;
  const out = await mutate((db) => {
    let n = 0;
    for (const d of seq(db, res)) {
      if (!ids.includes(String(d[res.idField]))) continue;
      const r = coerceField(field, value, db, res, String(d[res.idField]));
      if ("error" in r) return r;
      if (res.key === "currencies" && d.base && field.key === "enabled") continue;
      d[field.key] = r.value;
      EXTRAS[res.key]?.(d, d);
      n++;
    }
    audit(db, g.admin, "bulk", res.key, `${n}`, `${field.key}=${String(value)}`);
    return { n };
  });
  if ("error" in out) return fail(out.error);
  bust(res.tags, res.paths);
  return ok({ n: out.n });
}

/** Flat rows for CSV/Excel: language fields become two columns (en / ur). */
export function exportRows(res: Resource, db: DB, lang: "zh" | "en") {
  const cols = res.fields.map((f) => ({ f, head: f.label[lang] }));
  const header: string[] = [];
  for (const { f, head } of cols) {
    if (f.type === "lang" || f.type === "langarea" || f.type === "markdown") header.push(`${head} (EN)`, `${head} (UR)`);
    else if (f.type !== "seo") header.push(head);
  }
  const rows = seq(db, res).map((d) => {
    const row: string[] = [];
    for (const { f } of cols) {
      const v = get(d, f.key);
      if (f.type === "lang" || f.type === "langarea" || f.type === "markdown") row.push(String((v as L | undefined)?.en ?? ""), String((v as L | undefined)?.ur ?? ""));
      else if (f.type === "seo") continue;
      else if (Array.isArray(v)) row.push(v.join("; "));
      else row.push(v == null ? "" : String(v));
    }
    return row;
  });
  return { header, rows };
}
