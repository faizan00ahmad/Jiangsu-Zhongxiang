import { priceCart } from "@/lib/server/checkout";
import { evaluateCoupon } from "@/lib/server/coupons";
import { getDb } from "@/lib/server/db";
import { clientIp, fail, ok, readJson, str, throttled } from "@/lib/server/http";
import { currentUser } from "@/lib/server/session";
import { depositFor } from "@/lib/pricing";

/** Prices a cart the browser holds (guests) or previews a coupon. Nothing is saved; the order is priced again when it is placed. */
export async function POST(req: Request) {
  const b = await readJson(req);
  if (!b || !Array.isArray(b.items)) return fail("invalid_input");
  if (throttled(`cartprice:${clientIp(req)}`, 120, 10 * 60 * 1000)) return fail("too_many_attempts", 429);
  const user = await currentUser();
  const db = await getDb();
  const items = b.items.slice(0, 20).map((x: Record<string, unknown>) => ({ quoteId: str(x?.quoteId, 40), qty: typeof x?.qty === "number" ? x.qty : 1, id: str(x?.id, 20) || undefined }));
  const view = priceCart(db, user?.id ?? null, items);
  const percent = db.settings.depositPercent;

  // a coupon is used once, on the bike where it saves most
  let discount = 0;
  let couponCode: string | null = null;
  let couponError: string | null = null;
  let bestUnit = 0;
  const typed = str(b.coupon, 40);
  if (typed) {
    if (!user) couponError = "unauthorized";
    else {
      let firstError: string | null = null;
      for (const l of view.lines) {
        if (l.problem === "gone" || l.problem === "unavailable") continue;
        const r = evaluateCoupon(db, typed, { model: l.slug, total: l.unit, userId: user.id });
        if (r.ok) {
          if (r.discount > discount) (discount = r.discount), (couponCode = r.coupon.code), (bestUnit = l.unit);
        } else firstError ??= r.error;
      }
      if (!couponCode) couponError = firstError ?? "coupon_invalid";
    }
  }
  const total = view.subtotal - discount;
  // the advance is worked out bike by bike, the same way the orders will be
  const live = view.lines.filter((l) => l.problem !== "gone" && l.problem !== "unavailable");
  let deposit = live.reduce((s, l) => s + depositFor(l.unit, percent) * l.qty, 0);
  if (discount && bestUnit) deposit += depositFor(bestUnit - discount, percent) - depositFor(bestUnit, percent);
  return ok({ view, discount, couponCode, couponError, total, deposit, depositPercent: percent, loggedIn: !!user });
}
