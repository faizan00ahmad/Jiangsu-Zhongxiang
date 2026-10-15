import { isCity } from "@/lib/catalog";
import { guard } from "@/lib/server/admin";
import { randomId } from "@/lib/server/crypto";
import { mutate } from "@/lib/server/db";
import { fail, ok, readJson, str } from "@/lib/server/http";

const text = (v: unknown, max: number) => {
  const o = (v ?? {}) as Record<string, unknown>;
  return { en: str(o.en, max), ur: str(o.ur, max) };
};

/** Add a dealership (HQ roles). */
export async function POST(req: Request) {
  const g = await guard("inventory");
  if (g.res) return g.res;
  if (g.admin.role === "dealer") return fail("forbidden", 403);
  const b = await readJson(req);
  if (!b || !isCity(b.city)) return fail("invalid_input");
  const name = text(b.name, 80);
  const address = text(b.address, 160);
  const phone = str(b.phone, 30);
  if (!name.en || !address.en || !phone) return fail("invalid_input");
  const city = b.city;
  await mutate((db) => {
    db.dealers.push({ id: `dl-${randomId(5)}`, name: { en: name.en, ur: name.ur || name.en }, address: { en: address.en, ur: address.ur || address.en }, city, phone, stock: Object.fromEntries(db.models.map((m) => [m.slug, 0])), enabled: true });
  });
  return ok();
}

/** Edit a dealership's details or list/unlist it (HQ roles). */
export async function PUT(req: Request) {
  const g = await guard("inventory");
  if (g.res) return g.res;
  if (g.admin.role === "dealer") return fail("forbidden", 403);
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
    return true;
  });
  return res ? ok() : fail("not_found", 404);
}
