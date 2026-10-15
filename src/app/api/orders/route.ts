import { STAGES } from "@/lib/catalog";
import { code } from "@/lib/server/crypto";
import { mutate } from "@/lib/server/db";
import { fail, normalizePhone, ok, readJson, str } from "@/lib/server/http";
import { currentUser } from "@/lib/server/session";
import { depositFor, priceQuote } from "@/lib/pricing";
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
  const dealerId = str(c.dealerId, 40);
  if (!name) return fail("name_required");
  if (!phone) return fail("invalid_phone");
  if (!dealerId) return fail("dealer_required");

  const res = await mutate((db): { error: string; n?: number } | { order: Order } => {
    const quote = db.quotes.find((q) => q.id === str(b.quoteId, 40) && (q.userId === user.id || q.userId === null));
    if (!quote) return { error: "not_found" };
    const model = db.models.find((m) => m.slug === quote.model && m.enabled);
    if (!model) return { error: "model_unavailable" };
    const dealer = db.dealers.find((d) => d.id === dealerId && d.enabled);
    if (!dealer) return { error: "dealer_required" };
    const open = db.orders.filter((o) => o.userId === user.id && o.status === "pending_payment").length;
    if (open >= db.settings.maxOpenOrders) return { error: "too_many_open", n: open };
    if ((db.factoryStock[model.slug] ?? 0) <= 0) return { error: "out_of_stock" };

    db.factoryStock[model.slug] -= 1;
    if (quote.userId === null) quote.userId = user.id;
    const p = priceQuote(model, db.options, quote.config);
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
      total: p.total,
      depositPercent: db.settings.depositPercent,
      deposit: depositFor(p.total, db.settings.depositPercent),
      contact: { name, phone, city: dealer.city, dealerId: dealer.id },
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
    return { order };
  });
  if ("error" in res) return fail(res.error, res.error === "not_found" ? 404 : 409);
  return ok({ id: res.order.id });
}
