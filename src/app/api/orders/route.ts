import { STAGES, isCity } from "@/lib/catalog";
import { code } from "@/lib/server/crypto";
import { mutate } from "@/lib/server/db";
import { fail, normalizePhone, ok, readJson, str } from "@/lib/server/http";
import { currentUser } from "@/lib/server/session";
import { depositFor, priceQuote } from "@/lib/pricing";
import { evaluateCoupon } from "@/lib/server/coupons";
import { zoneFor } from "@/lib/shipping";
import { pkr } from "@/lib/format";
import { notify } from "@/lib/server/notify";
import type { Order } from "@/lib/types";

/** Submits an overseas order from a quotation. Reserves one factory unit; the deposit must follow within the lock window. */
export async function POST(req: Request) {
  const b = await readJson(req);
  if (!b) return fail("invalid_input");
  const user = await currentUser();
  if (!user) return fail("unauthorized", 401);
  const c = (b.contact ?? {}) as Record<string, unknown>;
  const name = str(c.name, 80);
  const phone = normalizePhone(c.phone);
  const city = isCity(c.city) ? c.city : null;
  if (!name) return fail("name_required");
  if (!phone) return fail("invalid_phone");
  if (!city) return fail("city_required");

  const res = await mutate((db): { error: string; n?: number } | { order: Order } => {
    const quote = db.quotes.find((q) => q.id === str(b.quoteId, 40) && (q.userId === user.id || q.userId === null));
    if (!quote) return { error: "not_found" };
    const model = db.models.find((m) => m.slug === quote.model && m.enabled);
    if (!model) return { error: "model_unavailable" };
    const open = db.orders.filter((o) => o.userId === user.id && o.status === "pending_payment").length;
    if (open >= db.settings.maxOpenOrders) return { error: "too_many_open", n: open };
    if ((db.factoryStock[model.slug] ?? 0) <= 0) return { error: "out_of_stock" };

    const p = priceQuote(model, db.options, quote.config);
    // a coupon is re-checked here, before anything is reserved; the number the browser showed is never trusted
    let discount = 0;
    let couponCode: string | null = null;
    if (typeof b.coupon === "string" && b.coupon.trim()) {
      const r = evaluateCoupon(db, b.coupon, { model: model.slug, total: p.total, userId: user.id });
      if (!r.ok) return { error: r.error };
      discount = r.discount;
      couponCode = r.coupon.code;
      r.coupon.used += 1;
    }
    const total = p.total - discount;

    db.factoryStock[model.slug] -= 1;
    if (quote.userId === null) quote.userId = user.id;
    const now = new Date();
    let id = "";
    do id = `ZX-PK-${code(6)}`;
    while (db.orders.some((o) => o.id === id));
    const order: Order = {
      id,
      userId: user.id,
      quoteId: quote.id,
      model: model.slug,
      modelName: model.name,
      config: p.config,
      lines: p.lines,
      basePrice: model.basePrice,
      total,
      discount,
      couponCode,
      shipping: zoneFor(db.zones.filter((z) => z.enabled), city)?.baseCost ?? 0, // estimate only; not part of the price or the advance
      depositPercent: db.settings.depositPercent,
      deposit: depositFor(total, db.settings.depositPercent),
      contact: { name, phone, city, dealerId: null }, // the pickup store is chosen after ordering
      status: "pending_payment",
      stage: 0,
      stageTimes: STAGES.map((_, i) => (i === 0 ? now.toISOString() : null)),
      eta: null,
      trackingNo: null,
      carrier: null,
      payment: null,
      createdAt: now.toISOString(),
      lockExpiresAt: new Date(now.getTime() + db.settings.lockHours * 3600000).toISOString(),
      history: [{ at: now.toISOString(), by: "customer", action: "order.created" }],
    };
    db.orders.push(order);
    notify(db, "order.created", { name: name, phone, email: user.email }, { order: order.id, model: order.modelName, deposit: pkr(order.deposit, "en"), lockUntil: order.lockExpiresAt.slice(0, 16).replace("T", " ") + " UTC" }, order.id);
    return { order };
  });
  if ("error" in res) return fail(res.error, res.error === "not_found" ? 404 : 409);
  return ok({ id: res.order.id });
}
