import { guard } from "@/lib/server/admin";
import { mutate } from "@/lib/server/db";
import { fail, int, ok, readJson } from "@/lib/server/http";

/** Updates factory export stock (HQ roles) and/or one dealership's stock (dealers: their own store only). */
export async function PUT(req: Request) {
  const g = await guard("inventory");
  if (g.res) return g.res;
  const { admin } = g;
  const b = await readJson(req);
  if (!b) return fail("invalid_input");
  const res = await mutate((db) => {
    if (b.factory && typeof b.factory === "object") {
      if (admin.role === "dealer") return "forbidden";
      for (const [slug, v] of Object.entries(b.factory as Record<string, unknown>)) {
        const q = int(v, 0, 1_000_000);
        if (q !== null && db.models.some((m) => m.slug === slug)) db.factoryStock[slug] = q;
      }
    }
    if (b.dealer && typeof b.dealer === "object") {
      const { id, stock } = b.dealer as { id?: unknown; stock?: unknown };
      if (admin.role === "dealer" && id !== admin.dealerId) return "forbidden";
      const d = db.dealers.find((x) => x.id === id);
      if (!d) return "not_found";
      for (const [slug, v] of Object.entries((stock ?? {}) as Record<string, unknown>)) {
        const q = int(v, 0, 100_000);
        if (q !== null && db.models.some((m) => m.slug === slug)) d.stock[slug] = q;
      }
    }
    return "ok";
  });
  return res === "ok" ? ok() : fail(res, res === "forbidden" ? 403 : 404);
}
