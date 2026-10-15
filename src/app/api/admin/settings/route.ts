import { guard } from "@/lib/server/admin";
import { mutate } from "@/lib/server/db";
import { fail, int, ok, readJson, str } from "@/lib/server/http";

export async function PUT(req: Request) {
  const g = await guard("settings");
  if (g.res) return g.res;
  const b = await readJson(req);
  if (!b) return fail("invalid_input");
  await mutate((db) => {
    const s = db.settings;
    s.depositPercent = int(b.depositPercent, 1, 100) ?? s.depositPercent;
    s.lockHours = int(b.lockHours, 1, 24 * 30) ?? s.lockHours;
    s.maxOpenOrders = int(b.maxOpenOrders, 1, 20) ?? s.maxOpenOrders;
    s.lowStock = int(b.lowStock, 0, 1000) ?? s.lowStock;
    for (const k of ["heroTitle", "heroText"] as const) {
      const v = b[k] as Record<string, unknown> | undefined;
      if (v) s[k] = { en: str(v.en, 400) || s[k].en, ur: str(v.ur, 400) || s[k].ur };
    }
  });
  return ok();
}
