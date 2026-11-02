import { audit, guard } from "@/lib/server/admin";
import { bust } from "@/lib/server/cache";
import { mutate } from "@/lib/server/db";
import { fail, int, ok, readJson, str } from "@/lib/server/http";

export async function PUT(req: Request) {
  const g = await guard("settings.edit");
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
    if (typeof b.maintenance === "boolean") s.maintenance = b.maintenance;
    const c = b.company as Record<string, unknown> | undefined;
    if (c) {
      const a = (c.address ?? {}) as Record<string, unknown>;
      const h = (c.hours ?? {}) as Record<string, unknown>;
      const email = (v: unknown) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str(v, 120)) ? str(v, 120) : "");
      const map = str(c.map, 400);
      s.company = {
        name: str(c.name, 80) || s.company?.name || "",
        email: email(c.email) || s.company?.email || "",
        supportEmail: email(c.supportEmail),
        phone: str(c.phone, 40),
        whatsapp: str(c.whatsapp, 20).replace(/[^\d]/g, ""),
        address: { en: str(a.en, 200), ur: str(a.ur, 200) },
        hours: { en: str(h.en, 100), ur: str(h.ur, 100) },
        map: /^https:\/\//i.test(map) ? map : null,
      };
    }
    const so = b.social as Record<string, unknown> | undefined;
    if (so) {
      // only https profile links on the four networks are kept
      const link = (v: unknown, host: RegExp) => {
        const u = str(v, 200);
        return /^https:\/\//i.test(u) && host.test(u) ? u : "";
      };
      s.social = {
        tiktok: link(so.tiktok, /^https:\/\/([\w-]+\.)?tiktok\.com\//i),
        facebook: link(so.facebook, /^https:\/\/([\w-]+\.)?(facebook|fb)\.com\//i),
        instagram: link(so.instagram, /^https:\/\/([\w-]+\.)?instagram\.com\//i),
        youtube: link(so.youtube, /^https:\/\/([\w-]+\.)?(youtube\.com|youtu\.be)\//i),
      };
    }
    audit(db, g.admin, "update", "settings", "system", `deposit ${s.depositPercent}%, lock ${s.lockHours}h${s.maintenance ? ", maintenance ON" : ""}`);
  });
  bust(["settings", "content"], ["/"]);
  return ok();
}
