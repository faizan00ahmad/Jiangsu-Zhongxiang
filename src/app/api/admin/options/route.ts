import { guard } from "@/lib/server/admin";
import { mutate } from "@/lib/server/db";
import { fail, int, ok, readJson, str } from "@/lib/server/http";

/** Saves option pricing / labels / on-off for every group (only known groups and items, plus new colours). */
export async function PUT(req: Request) {
  const g = await guard("options");
  if (g.res) return g.res;
  const b = await readJson(req);
  if (!b || !Array.isArray(b.groups)) return fail("invalid_input");
  await mutate((db) => {
    for (const raw of b.groups as Record<string, unknown>[]) {
      const grp = db.options.find((x) => x.key === raw.key);
      if (!grp) continue;
      if (typeof raw.enabled === "boolean") grp.enabled = raw.enabled;
      for (const ri of Array.isArray(raw.items) ? (raw.items as Record<string, unknown>[]) : []) {
        let it = grp.items.find((x) => x.id === ri.id);
        if (!it && grp.kind === "color" && typeof ri.id === "string" && /^[a-z0-9-]{2,24}$/.test(ri.id)) {
          it = { id: ri.id, label: { en: "", ur: "" }, price: 0, enabled: true, hex: "#888888" };
          grp.items.push(it);
        }
        if (!it) continue;
        const price = int(ri.price, 0, 10_000_000);
        if (price !== null) it.price = price;
        if (typeof ri.enabled === "boolean") it.enabled = ri.enabled;
        const lbl = ri.label as Record<string, unknown> | undefined;
        if (lbl) it.label = { en: str(lbl.en, 60) || it.label.en, ur: str(lbl.ur, 60) || it.label.ur };
        if (grp.kind === "color" && typeof ri.hex === "string" && /^#[0-9a-fA-F]{6}$/.test(ri.hex)) it.hex = ri.hex.toLowerCase();
        if (grp.key === "battery") {
          const f = typeof ri.rangeFactor === "number" ? ri.rangeFactor : Number(ri.rangeFactor);
          if (Number.isFinite(f) && f >= 0.5 && f <= 5) it.rangeFactor = Math.round(f * 100) / 100;
        }
      }
      // a group must keep at least one enabled choice
      if (!grp.items.some((i) => i.enabled)) grp.items[0].enabled = true;
    }
  });
  return ok();
}
