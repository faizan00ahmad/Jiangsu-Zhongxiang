import { STAGES } from "../catalog";
import { depositFor, priceQuote } from "../pricing";
import { pkr } from "../format";
import { zoneFor } from "../shipping";
import type { CartItem, CityKey, DB, Order, QuoteLine, User } from "../types";
import { QUOTE_ID_MAX, ensureQuote, findQuote } from "../quoteKey";
import { evaluateCoupon } from "./coupons";
import { code, randomId } from "./crypto";
import { notify } from "./notify";

export const MAX_QTY = 5; // of one build
export const MAX_UNITS = 10; // in one cart

export type CartProblem = "gone" | "unavailable" | "out_of_stock" | "limited" | null;
export type CartLine = {
  id: string;
  quoteId: string;
  qty: number;
  slug: string;
  name: string;
  lines: QuoteLine[];
  unit: number; // price of one bike today
  total: number; // unit × qty
  stock: number; // units the factory has left
  problem: CartProblem; // limited = fewer in stock than asked for, others cannot be bought at all
  config: Record<string, string | undefined>;
};
export type CartView = { lines: CartLine[]; units: number; subtotal: number; ok: boolean };

const clampQty = (v: unknown) => Math.max(1, Math.min(MAX_QTY, Math.round(typeof v === "number" ? v : Number(v) || 1)));

/** Prices every line against today's catalogue and stock. A guest may only use quotes nobody owns; a customer also their own. */
export function priceCart(db: DB, userId: string | null, items: { id?: string; quoteId: string; qty: number }[]): CartView {
  const taken: Record<string, number> = {};
  const lines: CartLine[] = items.map((it, i) => {
    const q = findQuote(db, it.quoteId, userId);
    const base = { id: it.id ?? `l${i}`, quoteId: it.quoteId, qty: clampQty(it.qty) };
    const model = q && db.models.find((m) => m.slug === q.model);
    if (!q || !model) return { ...base, slug: q?.model ?? "", name: q?.modelName ?? "", lines: [], unit: 0, total: 0, stock: 0, problem: "gone", config: {} };
    if (!model.enabled) return { ...base, slug: model.slug, name: model.name, lines: [], unit: 0, total: 0, stock: 0, problem: "unavailable", config: {} };
    const p = priceQuote(model, db.options, q.config);
    const stock = db.factoryStock[model.slug] ?? 0;
    const already = taken[model.slug] ?? 0;
    taken[model.slug] = already + base.qty;
    const left = Math.max(0, stock - already);
    const problem: CartProblem = left <= 0 ? "out_of_stock" : base.qty > left ? "limited" : null;
    return { ...base, slug: model.slug, name: model.name, lines: p.lines, unit: p.total, total: p.total * base.qty, stock: left, problem, config: p.config as Record<string, string | undefined> };
  });
  const units = lines.reduce((s, l) => s + l.qty, 0);
  return { lines, units, subtotal: lines.reduce((s, l) => s + l.total, 0), ok: lines.length > 0 && units <= MAX_UNITS && lines.every((l) => l.problem === null) };
}

/* ── the signed-in customer's cart ── */

const cartOf = (u: User) => (u.cart ??= []);

export function addToCart(db: DB, user: User, quoteId: string, qty: number, replace: boolean): "ok" | "not_found" | "cart_full" {
  const q = ensureQuote(db, quoteId, user.id);
  if (!q || !db.models.some((m) => m.slug === q.model && m.enabled)) return "not_found";
  if (q.userId === null) q.userId = user.id;
  if (replace) user.cart = [];
  const cart = cartOf(user);
  const have = cart.find((c) => c.quoteId === quoteId);
  const next = clampQty((have?.qty ?? 0) + qty);
  const units = cart.reduce((s, c) => s + c.qty, 0) - (have?.qty ?? 0) + next;
  if (units > MAX_UNITS) return "cart_full";
  if (have) have.qty = next;
  else cart.push({ id: randomId(5), quoteId, qty: next });
  return "ok";
}

export function setCartQty(user: User, id: string, qty: number): "ok" | "not_found" | "cart_full" {
  const cart = cartOf(user);
  const line = cart.find((c) => c.id === id);
  if (!line) return "not_found";
  const next = clampQty(qty);
  if (cart.reduce((s, c) => s + c.qty, 0) - line.qty + next > MAX_UNITS) return "cart_full";
  line.qty = next;
  return "ok";
}

export const removeFromCart = (user: User, id: string) => void (user.cart = cartOf(user).filter((c) => c.id !== id));

/** A guest's browser cart joins the account's cart on sign-in. Same build adds up, anything over the limit is left out. */
export function mergeCart(db: DB, user: User, items: unknown) {
  if (!Array.isArray(items)) return;
  for (const it of items.slice(0, 20)) {
    const r = it as Record<string, unknown>;
    if (typeof r?.quoteId !== "string") continue;
    addToCart(db, user, r.quoteId.slice(0, QUOTE_ID_MAX), clampQty(r.qty), false);
  }
}

/** The cart as the browser may keep it: only ids and quantities, never prices. */
export const cartItems = (u: User): CartItem[] => (u.cart ?? []).map((c) => ({ ...c }));

/* ── placing the orders ── */

export type CheckoutError = "empty_cart" | "cart_changed" | "too_many_open" | "coupon_invalid" | "coupon_expired" | "coupon_model" | "coupon_min" | "coupon_used_up" | "coupon_per_user";

/** Turns the signed-in customer's cart into orders, one per bike, reserving the factory units. Everything or nothing:
 *  when anything is wrong the caller's `mutate` has changed nothing yet. Call it first inside `mutate`, and only then touch other state. */
export function placeOrders(db: DB, user: User, contact: { name: string; phone: string; city: CityKey }, couponCode: string | null): { error: CheckoutError; n?: number } | { orders: Order[]; groupId: string; couponCode: string | null } {
  const cart = cartOf(user);
  if (!cart.length) return { error: "empty_cart" };
  const view = priceCart(db, user.id, cart);
  if (!view.ok) return { error: "cart_changed" };

  // unpaid checkouts count once each, however many bikes they hold
  const open = new Set(db.orders.filter((o) => o.userId === user.id && o.status === "pending_payment").map((o) => o.groupId ?? o.id));
  if (open.size >= db.settings.maxOpenOrders) return { error: "too_many_open", n: open.size };

  // a coupon is used once per checkout, on the bike where it saves the most
  let best: { line: CartLine; discount: number; code: string } | null = null;
  if (couponCode) {
    let firstError: string | null = null;
    for (const l of view.lines) {
      const r = evaluateCoupon(db, couponCode, { model: l.slug, total: l.unit, userId: user.id });
      if (r.ok) {
        if (!best || r.discount > best.discount) best = { line: l, discount: r.discount, code: r.coupon.code };
      } else firstError ??= r.error;
    }
    if (!best) return { error: (firstError ?? "coupon_invalid") as CheckoutError };
    const c = db.coupons.find((x) => x.code === best!.code);
    if (c) c.used += 1;
  }

  const now = new Date();
  const groupId = `CK-${code(8)}`;
  const orders: Order[] = [];
  for (const l of view.lines) {
    const q = ensureQuote(db, l.quoteId, user.id)!;
    const model = db.models.find((m) => m.slug === l.slug)!;
    if (q.userId === null) q.userId = user.id;
    db.factoryStock[l.slug] = (db.factoryStock[l.slug] ?? 0) - l.qty;
    for (let k = 0; k < l.qty; k++) {
      const discount = best && best.line === l && k === 0 ? best.discount : 0;
      const total = l.unit - discount;
      let id = "";
      do id = `ZX-PK-${code(6)}`;
      while (db.orders.some((o) => o.id === id));
      const order: Order = {
        id,
        userId: user.id,
        quoteId: q.id,
        model: model.slug,
        modelName: model.name,
        config: l.config,
        lines: l.lines,
        basePrice: model.basePrice,
        total,
        discount,
        couponCode: discount ? best!.code : null,
        groupId,
        shipping: zoneFor(db.zones.filter((z) => z.enabled), contact.city)?.baseCost ?? 0, // estimate only; not part of the price or the advance
        depositPercent: db.settings.depositPercent,
        deposit: depositFor(total, db.settings.depositPercent),
        contact: { ...contact, dealerId: null }, // the pickup store is chosen after ordering
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
      orders.push(order);
      notify(db, "order.created", { name: contact.name, phone: contact.phone, email: user.email }, { order: order.id, model: order.modelName, deposit: pkr(order.deposit, "en"), lockUntil: order.lockExpiresAt.slice(0, 16).replace("T", " ") + " UTC" }, order.id);
    }
  }
  user.cart = [];
  return { orders, groupId, couponCode: best?.code ?? null };
}
