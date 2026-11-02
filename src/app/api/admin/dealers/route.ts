import { isCity } from "@/lib/catalog";
import { audit, guard } from "@/lib/server/admin";
import { bust } from "@/lib/server/cache";
import { randomId } from "@/lib/server/crypto";
import { mutate } from "@/lib/server/db";
import { fail, ok, readJson, str } from "@/lib/server/http";
import type { Dealer } from "@/lib/types";

const text = (v: unknown, max: number) => {
  const o = (v ?? {}) as Record<string, unknown>;
  return { en: str(o.en, max), ur: str(o.ur, max) };
};
const mapUrl = (v: unknown) => {
  const s = str(v, 400);
  return /^https:\/\/(www\.)?(google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|goo\.gl\/maps|maps\.app\.goo\.gl)\//i.test(s) ? s : null;
};
const image = (v: unknown) => {
  const s = str(v, 300);
  return /^\/api\/files\/[\w.-]+$/.test(s) ? s : null;
};

/** Add a dealership (HQ roles). Every dealer also gets its own page on the site: /dealers/<id>. */
export async function POST(req: Request) {
  const g = await guard("inventory.create");
  if (g.res) return g.res;
  if (g.admin.scope === "dealer") return fail("forbidden", 403);
  const b = await readJson(req);
  if (!b || !isCity(b.city)) return fail("invalid_input");
  const name = text(b.name, 80);
  const address = text(b.address, 160);
  const phone = str(b.phone, 30);
  if (!name.en || !address.en || !phone) return fail("invalid_input");
  const city = b.city;
  await mutate((db) => {
    const d: Dealer = { id: `dl-${randomId(5)}`, name: { en: name.en, ur: name.ur || name.en }, address: { en: address.en, ur: address.ur || address.en }, city, phone, stock: Object.fromEntries(db.models.map((m) => [m.slug, 0])), enabled: true, hours: text(b.hours, 80), map: mapUrl(b.map), image: image(b.image) };
    db.dealers.push(d);
    audit(db, g.admin, "create", "dealers", d.id, d.name.en);
  });
  bust(["catalogue"], ["/inventory"]);
  return ok();
}

/** Edit a dealership's details or list/unlist it (HQ roles). */
export async function PUT(req: Request) {
  const g = await guard("inventory.edit");
  if (g.res) return g.res;
  if (g.admin.scope === "dealer") return fail("forbidden", 403);
  const b = await readJson(req);
  if (!b) return fail("invalid_input");
  const res = await mutate((db) => {
    const d = db.dealers.find((x) => x.id === b.id);
    if (!d) return false;
    if (typeof b.enabled === "boolean") d.enabled = b.enabled;
    if (b.name) {
      const n = text(b.name, 80);
      d.name = { en: n.en || d.name.en, ur: n.ur || d.name.ur };
    }
    if (b.address) {
      const a = text(b.address, 160);
      d.address = { en: a.en || d.address.en, ur: a.ur || d.address.ur };
    }
    if (str(b.phone, 30)) d.phone = str(b.phone, 30);
    if (isCity(b.city)) d.city = b.city;
    if (b.hours) d.hours = text(b.hours, 80);
    if ("map" in b) d.map = mapUrl(b.map);
    if ("image" in b) d.image = image(b.image);
    audit(db, g.admin, "update", "dealers", d.id, d.name.en);
    return true;
  });
  if (res) bust(["catalogue"], ["/inventory", "/dealers"]);
  return res ? ok() : fail("not_found", 404);
}
