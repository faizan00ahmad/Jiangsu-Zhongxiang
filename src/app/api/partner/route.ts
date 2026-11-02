import { isCity } from "@/lib/catalog";
import { randomId } from "@/lib/server/crypto";
import { mutate } from "@/lib/server/db";
import { clientIp, fail, normalizePhone, ok, readJson, str, throttled } from "@/lib/server/http";
import { notify } from "@/lib/server/notify";
import type { PartnerType } from "@/lib/types";

const TYPES: PartnerType[] = ["agent", "distributor", "affiliate"];
const SHOP = ["none", "shop", "showroom"] as const;

/** Public agent / distributor / affiliate application. Rate limited; stored for the admin pipeline. */
export async function POST(req: Request) {
  const b = await readJson(req);
  if (!b) return fail("invalid_input");
  if (throttled(`partner:${clientIp(req)}`, 5, 60 * 60 * 1000)) return fail("too_many_attempts", 429);
  const type = TYPES.find((x) => x === b.type);
  const name = str(b.name, 80);
  const phone = normalizePhone(b.phone);
  const email = str(b.email, 120);
  const city = isCity(b.city) ? b.city : null;
  if (!type || !name) return fail("required");
  if (!phone) return fail("invalid_phone");
  if (!city) return fail("city_required");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("invalid_email");
  const shop = SHOP.find((x) => x === b.shop) ?? "none";
  const id = `PA-${randomId(5).toUpperCase().replace(/[^A-Z0-9]/g, "X")}`;
  await mutate((db) => {
    db.partners.push({ id, type, name, business: str(b.business, 100), phone, email, city, experience: str(b.experience, 600), shop, message: str(b.message, 800), status: "new", assignee: "", adminNote: "", createdAt: new Date().toISOString() });
    notify(db, "partner.received", { name, email: email || null, phone }, { type, ref: id }, id);
  });
  return ok({ id });
}
