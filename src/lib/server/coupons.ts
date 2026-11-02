import type { Coupon, DB, Order } from "@/lib/types";

export type CouponResult = { ok: true; coupon: Coupon; discount: number } | { ok: false; error: string };

/** Runs every rule of a coupon against an order total. The result is the only place a discount is ever worked out. */
export function evaluateCoupon(db: DB, rawCode: unknown, ctx: { model: string; total: number; userId: string | null }): CouponResult {
  const code = typeof rawCode === "string" ? rawCode.trim().toUpperCase().slice(0, 40) : "";
  if (!code) return { ok: false, error: "coupon_invalid" };
  const c = db.coupons.find((x) => x.code === code);
  if (!c || !c.enabled) return { ok: false, error: "coupon_invalid" };
  const today = new Date().toISOString().slice(0, 10);
  if ((c.start && today < c.start.slice(0, 10)) || (c.end && today > c.end.slice(0, 10))) return { ok: false, error: "coupon_expired" };
  if (c.models.length && !c.models.includes(ctx.model)) return { ok: false, error: "coupon_model" };
  if (c.minTotal > 0 && ctx.total < c.minTotal) return { ok: false, error: "coupon_min" };
  if (c.usageLimit > 0 && c.used >= c.usageLimit) return { ok: false, error: "coupon_used_up" };
  if (c.perUser > 0 && ctx.userId) {
    const mine = db.orders.filter((o) => o.userId === ctx.userId && o.couponCode === c.code && o.status !== "cancelled" && o.status !== "expired").length;
    if (mine >= c.perUser) return { ok: false, error: "coupon_per_user" };
  }
  let discount = c.type === "percent" ? Math.round((ctx.total * c.value) / 100) : c.value;
  if (c.maxDiscount > 0) discount = Math.min(discount, c.maxDiscount);
  discount = Math.max(0, Math.min(discount, ctx.total));
  if (discount <= 0) return { ok: false, error: "coupon_invalid" };
  return { ok: true, coupon: c, discount };
}

/** A cancelled or expired order gives its coupon use back. */
export function releaseCoupon(db: DB, o: Order) {
  if (!o.couponCode) return;
  const c = db.coupons.find((x) => x.code === o.couponCode);
  if (c && c.used > 0) c.used -= 1;
}
