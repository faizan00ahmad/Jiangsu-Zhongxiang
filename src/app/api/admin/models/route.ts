import { KIND_META } from "@/lib/catalog";
import { audit, guard } from "@/lib/server/admin";
import { bust } from "@/lib/server/cache";
import { mutate } from "@/lib/server/db";
import { fail, int, ok, readJson, str } from "@/lib/server/http";
import { GROUP_KEYS, type DB, type GroupKey, type Model, type Seo, type VehicleKind } from "@/lib/types";

const isKind = (v: unknown): v is VehicleKind => typeof v === "string" && v in KIND_META;
const isImage = (v: unknown) => v === null || (typeof v === "string" && /^\/api\/files\/[A-Za-z0-9_-]{6,64}\.(png|jpe?g|webp)$/.test(v));

function applyPatch(m: Model, p: Record<string, unknown>, colorIds: string[], db: DB) {
  if (typeof p.series === "string" && db.categories.some((c) => c.slug === p.series)) m.series = p.series;
  if (p.brand === null || p.brand === "") m.brand = null;
  else if (typeof p.brand === "string" && db.brands.some((b) => b.slug === p.brand)) m.brand = p.brand;
  if (Array.isArray(p.hideOptions)) m.hideOptions = [...new Set(p.hideOptions.filter((k): k is GroupKey => typeof k === "string" && (GROUP_KEYS as string[]).includes(k)))];
  if (Array.isArray(p.spin)) m.spin = p.spin.filter((s): s is string => typeof s === "string" && isImage(s)).slice(0, 72);
  if (Array.isArray(p.related)) m.related = [...new Set(p.related.filter((s): s is string => typeof s === "string" && s !== m.slug && db.models.some((x) => x.slug === s)))].slice(0, 8);
  if (p.seo && typeof p.seo === "object") {
    const s = p.seo as Record<string, Record<string, unknown>>;
    const L = (o: Record<string, unknown> | undefined, n: number) => ({ en: str(o?.en, n), ur: str(o?.ur, n) });
    const img = typeof (p.seo as Record<string, unknown>).image === "string" ? str((p.seo as Record<string, unknown>).image, 300) : "";
    m.seo = { title: L(s.title, 120), description: L(s.description, 300), image: /^\/api\/files\//.test(img) ? img : null, noindex: (p.seo as Record<string, unknown>).noindex === true } satisfies Seo;
  }
  if (typeof p.name === "string" && str(p.name, 60)) m.name = str(p.name, 60);
  if (p.tagline && typeof p.tagline === "object") {
    const t = p.tagline as Record<string, unknown>;
    m.tagline = { en: str(t.en, 140) || m.tagline.en, ur: str(t.ur, 140) || m.tagline.ur };
  }
  const price = int(p.basePrice, 1000, 50_000_000);
  if (price !== null) m.basePrice = price;
  if ("image" in p && isImage(p.image)) m.image = p.image as string | null;
  if (typeof p.defaultColor === "string" && (colorIds.includes(p.defaultColor) || m.colors.some((c) => c.id === p.defaultColor))) m.defaultColor = p.defaultColor;
  const variant = int(p.variant, 0, 2);
  if (variant !== null) m.variant = variant;
  const sort = int(p.sort, 0, 999);
  if (sort !== null) m.sort = sort;
  if (typeof p.enabled === "boolean") m.enabled = p.enabled;
  // real paint options: rename (EN/UR), surcharge, on/off — photos stay as captured/uploaded
  if (Array.isArray(p.colors)) {
    for (const rc of p.colors as Record<string, unknown>[]) {
      const c = m.colors.find((x) => x.id === rc.id);
      if (!c) continue;
      const lbl = rc.label as Record<string, unknown> | undefined;
      if (lbl) c.label = { en: str(lbl.en, 40) || c.label.en, ur: str(lbl.ur, 40) || c.label.ur };
      const price = int(rc.price, 0, 5_000_000);
      if (price !== null) c.price = price;
      if (typeof rc.enabled === "boolean") c.enabled = rc.enabled;
      if (typeof rc.hex === "string" && /^#[0-9a-fA-F]{6}$/.test(rc.hex)) c.hex = rc.hex.toLowerCase();
    }
    if (m.colors.length && !m.colors.some((c) => c.enabled)) m.colors[0].enabled = true;
    if (!m.colors.some((c) => c.id === m.defaultColor && c.enabled)) m.defaultColor = m.colors.find((c) => c.enabled)?.id ?? m.defaultColor;
  }
  if (p.specs && typeof p.specs === "object") {
    const s = p.specs as Record<string, unknown>;
    const num = (v: unknown, max: number) => {
      const x = typeof v === "number" ? v : Number(v);
      return Number.isFinite(x) && x >= 0 && x <= max ? Math.round(x * 10) / 10 : null;
    };
    for (const [k, max] of [["topSpeed", 300], ["range", 1000], ["motor", 50000], ["charge", 48], ["weight", 5000]] as const) {
      const v = num(s[k], max);
      if (v !== null) m.specs[k] = v;
    }
    for (const [k, max] of [["seats", 20], ["payload", 5000]] as const) {
      if (s[k] === "" || s[k] === null) delete m.specs[k];
      else {
        const v = num(s[k], max);
        if (v !== null) m.specs[k] = v;
      }
    }
  }
}

/** Edit a model. */
export async function PUT(req: Request) {
  const g = await guard("models.edit");
  if (g.res) return g.res;
  const b = await readJson(req);
  if (!b || typeof b.patch !== "object" || !b.patch) return fail("invalid_input");
  const res = await mutate((db) => {
    const m = db.models.find((x) => x.slug === b.slug);
    if (!m) return false;
    applyPatch(m, b.patch as Record<string, unknown>, (db.options.find((o) => o.key === "color")?.items ?? []).map((i) => i.id), db);
    audit(db, g.admin, "update", "models", m.slug, m.name);
    return true;
  });
  if (res) bust(["catalogue"], ["/", "/customize"]);
  return res ? ok() : fail("not_found", 404);
}

/** Add a model. */
export async function POST(req: Request) {
  const g = await guard("models.create");
  if (g.res) return g.res;
  const b = await readJson(req);
  if (!b) return fail("invalid_input");
  const slug = str(b.slug, 40).toLowerCase();
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || !isKind(b.kind) || !str(b.name, 60)) return fail("invalid_input");
  const kind = b.kind;
  const res = await mutate((db) => {
    if (db.models.some((m) => m.slug === slug)) return "slug_taken";
    const colors = (db.options.find((o) => o.key === "color")?.items ?? []).map((i) => i.id);
    const m: Model = {
      slug,
      kind,
      series: kind === "sport" ? "motorcycle" : kind === "commuter" ? "scooter" : "tricycle",
      brand: db.brands[0]?.slug ?? null,
      views: 0,
      related: [],
      seo: null,
      wheels: KIND_META[kind].wheels,
      name: str(b.name, 60),
      tagline: { en: "", ur: "" },
      basePrice: 100000,
      image: null,
      photos: { thumb: null, banner: null, gallery: [] },
      colors: [],
      specTable: [],
      specsEstimated: true,
      variant: 0,
      defaultColor: colors[0] ?? "pearl",
      specs: { topSpeed: 50, range: 80, motor: 1500, charge: 6, weight: 100, ...(kind === "cargo" ? { payload: 500 } : { seats: 2 }) },
      enabled: false,
      sort: db.models.length + 1,
    };
    applyPatch(m, b, colors, db);
    m.enabled = false; // new models start unlisted until reviewed
    db.models.push(m);
    db.factoryStock[slug] = 0;
    for (const d of db.dealers) d.stock[slug] = 0;
    audit(db, g.admin, "create", "models", slug, m.name);
    return "ok";
  });
  if (res === "ok") bust(["catalogue"], ["/", "/customize"]);
  return res === "ok" ? ok({ slug }) : fail(res, 409);
}

/** Remove a model that has never been ordered. Quotes keep their own copy of the name and price. */
export async function DELETE(req: Request) {
  const g = await guard("models.delete");
  if (g.res) return g.res;
  const b = await readJson(req);
  if (!b) return fail("invalid_input");
  const res = await mutate((db) => {
    const i = db.models.findIndex((m) => m.slug === b.slug);
    if (i < 0) return "not_found";
    if (db.orders.some((o) => o.model === b.slug)) return "in_use";
    audit(db, g.admin, "delete", "models", String(b.slug), db.models[i].name);
    db.models.splice(i, 1);
    delete db.factoryStock[String(b.slug)];
    for (const d of db.dealers) delete d.stock[String(b.slug)];
    for (const m of db.models) m.related = (m.related ?? []).filter((s) => s !== b.slug);
    return "ok";
  });
  if (res === "ok") bust(["catalogue"], ["/", "/customize"]);
  return res === "ok" ? ok() : fail(res, res === "not_found" ? 404 : 409);
}
