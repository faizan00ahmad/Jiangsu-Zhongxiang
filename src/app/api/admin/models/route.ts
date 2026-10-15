import { KIND_META } from "@/lib/catalog";
import { guard } from "@/lib/server/admin";
import { mutate } from "@/lib/server/db";
import { fail, int, ok, readJson, str } from "@/lib/server/http";
import type { Model, VehicleKind } from "@/lib/types";

const isKind = (v: unknown): v is VehicleKind => typeof v === "string" && v in KIND_META;
const isImage = (v: unknown) => v === null || (typeof v === "string" && /^\/api\/files\/[A-Za-z0-9_-]{6,64}\.(png|jpe?g|webp)$/.test(v));

function applyPatch(m: Model, p: Record<string, unknown>, colorIds: string[]) {
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
  const g = await guard("models");
  if (g.res) return g.res;
  const b = await readJson(req);
  if (!b || typeof b.patch !== "object" || !b.patch) return fail("invalid_input");
  const res = await mutate((db) => {
    const m = db.models.find((x) => x.slug === b.slug);
    if (!m) return false;
    applyPatch(m, b.patch as Record<string, unknown>, (db.options.find((o) => o.key === "color")?.items ?? []).map((i) => i.id));
    return true;
  });
  return res ? ok() : fail("not_found", 404);
}

/** Add a model. */
export async function POST(req: Request) {
  const g = await guard("models");
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
    applyPatch(m, b, colors);
    m.enabled = false; // new models start unlisted until reviewed
    db.models.push(m);
    db.factoryStock[slug] = 0;
    for (const d of db.dealers) d.stock[slug] = 0;
    return "ok";
  });
  return res === "ok" ? ok({ slug }) : fail(res, 409);
}
