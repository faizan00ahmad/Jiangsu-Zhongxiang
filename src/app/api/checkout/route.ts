import { isCity } from "@/lib/catalog";
import { placeOrders } from "@/lib/server/checkout";
import { mutate } from "@/lib/server/db";
import { enabledMethods } from "@/lib/server/gateways";
import { clientIp, fail, normalizePhone, ok, readJson, sameOrigin, str, throttled } from "@/lib/server/http";
import { openIntent } from "@/lib/server/payments";
import { currentUser } from "@/lib/server/session";
import type { PayMethod, PayMode } from "@/lib/types";

const METHODS: PayMethod[] = ["jazzcash", "easypaisa", "card", "bank"];

/** The checkout button: turns the cart into one order per bike and opens a payment attempt for all of them, in one step. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("invalid_input", 403);
  const user = await currentUser();
  if (!user) return fail("unauthorized", 401);
  if (throttled(`checkout:${clientIp(req)}`, 20, 10 * 60 * 1000)) return fail("too_many_attempts", 429);
  const b = await readJson(req);
  if (!b) return fail("invalid_input");
  const c = (b.contact ?? {}) as Record<string, unknown>;
  const name = str(c.name, 80);
  const phone = normalizePhone(c.phone);
  const city = isCity(c.city) ? c.city : null;
  const method = METHODS.find((m) => m === b.method);
  const mode: PayMode = b.mode === "full" ? "full" : "advance";
  if (!name) return fail("name_required");
  if (!phone) return fail("invalid_phone");
  if (!city) return fail("city_required");
  if (!method) return fail("method_required");
  const coupon = str(b.coupon, 40) || null;

  const res = await mutate((db): { error: string; n?: number } | { intentId: string; groupId: string } => {
    const u = db.users.find((x) => x.id === user.id);
    if (!u) return { error: "unauthorized" };
    // checked before anything is reserved: a refusal here must leave no orders behind
    if (!enabledMethods(db).includes(method)) return { error: "method_disabled" };
    const placed = placeOrders(db, u, { name, phone, city }, coupon);
    if ("error" in placed) return placed;
    const opened = openIntent(db, u, placed.orders.map((o) => o.id), method, mode);
    if ("error" in opened) return { error: opened.error };
    return { intentId: opened.intent.id, groupId: placed.groupId };
  });
  if ("error" in res) return fail(res.error, res.error === "unauthorized" ? 401 : 409);
  return ok(res);
}
