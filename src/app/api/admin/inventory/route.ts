import { audit, guard } from "@/lib/server/admin";
import { bust } from "@/lib/server/cache";
import { mutate } from "@/lib/server/db";
import { fail, int, ok, readJson } from "@/lib/server/http";

/** Updates factory export stock (HQ roles) and/or one dealership's stock (dealer-scoped roles: their own store only). */
export async function PUT(req: Request) {
  const g = await guard("inventory.edit");
  if (g.res) return g.res;
  const { admin } = g;
  const dealer = admin.scope === "dealer";
  const b = await readJson(req);
  if (!b) return fail("invalid_input");
  const res = await mutate((db) => {
    if (b.factory && typeof b.factory === "object") {
      if (dealer) return "forbidden";
      let n = 0;
      for (const [slug, v] of Object.entries(b.factory as Record<string, unknown>)) {
        const q = int(v, 0, 1_000_000);
        if (q !== null && db.models.some((m) => m.slug === slug) && db.factoryStock[slug] !== q) {
          db.factoryStock[slug] = q;
          n++;
        }
      }
      if (n) audit(db, admin, "update", "inventory", "factory", `${n} model(s)`);
    }
    if (b.dealer && typeof b.dealer === "object") {
      const { id, stock } = b.dealer as { id?: unknown; stock?: unknown };
      if (dealer && id !== admin.dealerId) return "forbidden";
      const d = db.dealers.find((x) => x.id === id);
      if (!d) return "not_found";
      for (const [slug, v] of Object.entries((stock ?? {}) as Record<string, unknown>)) {
        const q = int(v, 0, 100_000);
        if (q !== null && db.models.some((m) => m.slug === slug)) d.stock[slug] = q;
      }
      audit(db, admin, "update", "inventory", d.id, d.name.en);
    }
    return "ok";
  });
  if (res === "ok") bust(["catalogue"], ["/inventory", "/customize"]);
  return res === "ok" ? ok() : fail(res, res === "forbidden" ? 403 : 404);
}
