import { depositFor, priceQuote } from "@/lib/pricing";
import { evaluateCoupon } from "@/lib/server/coupons";
import { getDb } from "@/lib/server/db";
import { clientIp, fail, ok, readJson, str, throttled } from "@/lib/server/http";
import { currentUser } from "@/lib/server/session";

/** Tells the checkout what a coupon would take off. Nothing is reserved here; the order itself re-checks and counts the use. */
export async function POST(req: Request) {
  const b = await readJson(req);
  if (!b) return fail("invalid_input");
  if (throttled(`coupon:${clientIp(req)}`, 40)) return fail("too_many_attempts", 429);
  const user = await currentUser();
  if (!user) return fail("unauthorized", 401);
  const db = await getDb();
  const quote = db.quotes.find((q) => q.id === str(b.quoteId, 40) && (q.userId === user.id || q.userId === null));
  const model = quote && db.models.find((m) => m.slug === quote.model && m.enabled);
  if (!quote || !model) return fail("not_found", 404);
  const p = priceQuote(model, db.options, quote.config);
  const r = evaluateCoupon(db, b.code, { model: model.slug, total: p.total, userId: user.id });
  if (!r.ok) return fail(r.error);
  const total = p.total - r.discount;
  return ok({ code: r.coupon.code, discount: r.discount, total, deposit: depositFor(total, db.settings.depositPercent) });
}
