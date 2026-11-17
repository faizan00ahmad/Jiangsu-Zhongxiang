import { daysRemaining } from "../catalog";
import { pkr } from "../format";
import type { DB, Order, PayIntent, PayMethod, PayMode, User } from "../types";
import { INTENT_MINUTES, OTP_TRIES, WALLET_APPROVE_SECONDS, checkCard, checkWallet, enabledMethods, otpOk } from "./gateways";
import { code } from "./crypto";
import { notify } from "./notify";

const MAX_ATTEMPTS = 5;
export const METHOD_NAME: Record<PayMethod, string> = { jazzcash: "JazzCash", easypaisa: "Easypaisa", card: "Debit / credit card", bank: "Bank transfer" };

const iso = (d: Date) => d.toISOString();
const ordersOf = (db: DB, i: PayIntent) => i.orderIds.map((id) => db.orders.find((o) => o.id === id)).filter((o): o is Order => !!o);

/** What the browser may see of an attempt. Never includes the receipt's file name, only whether there is one. */
export function intentView(db: DB, i: PayIntent) {
  const bank = db.integrations.payments.bank;
  return {
    id: i.id,
    groupId: i.groupId,
    method: i.method,
    mode: i.mode,
    amount: i.amount,
    status: i.status,
    step: i.step,
    ref: i.ref,
    channel: i.channel,
    triesLeft: Math.max(0, OTP_TRIES - i.otpTries),
    approveUntil: i.approveUntil,
    expiresAt: i.expiresAt,
    hasReceipt: !!i.receipt,
    reviewNote: i.reviewNote,
    lastResult: i.attempts[i.attempts.length - 1]?.result ?? null,
    sandbox: i.method === "bank" ? false : db.integrations.payments[i.method].mode === "sandbox",
    bank: i.method === "bank" ? { accountTitle: bank.accountTitle, bankName: bank.bankName, accountNo: bank.accountNo, iban: bank.iban, raastId: bank.raastId, instructions: bank.instructions } : null,
    orders: ordersOf(db, i).map((o) => ({ id: o.id, model: o.model, name: o.modelName, total: o.total, deposit: o.deposit, status: o.status, paid: o.payment?.amount ?? 0 })),
  };
}

/** Timeouts are decided when someone looks: an approval window that ran out, an attempt that sat unpaid too long. */
export function refreshIntent(i: PayIntent, now = new Date()) {
  if (i.status !== "created" && i.status !== "awaiting") return;
  if (i.step === "approve" && i.approveUntil && now.getTime() > Date.parse(i.approveUntil)) {
    log(i, "timeout", now);
    i.status = "failed";
    i.updatedAt = iso(now);
    return;
  }
  if (now.getTime() > Date.parse(i.expiresAt)) {
    i.status = "expired";
    i.updatedAt = iso(now);
  }
}

function log(i: PayIntent, result: string, now = new Date(), note?: string) {
  i.attempts.push({ at: iso(now), result, ...(note ? { note } : {}) });
  i.updatedAt = iso(now);
}

/** What the gateway itself refused. A typo in the form is told to the customer and logged, but does not use up their tries. */
const REFUSALS = new Set(["card_declined", "card_insufficient", "wallet_inactive", "wallet_insufficient"]);

function fail(i: PayIntent, result: string, now: Date) {
  log(i, result, now);
  if (i.attempts.filter((a) => REFUSALS.has(a.result)).length >= MAX_ATTEMPTS) i.status = "failed";
  return { error: result };
}

/** Starts an attempt to pay for orders still waiting for their advance. Older open attempts for the same orders are closed. */
export function openIntent(db: DB, user: User, orderIds: string[], method: PayMethod, mode: PayMode): { error: string } | { intent: PayIntent } {
  const orders = orderIds.map((id) => db.orders.find((o) => o.id === id && o.userId === user.id));
  if (!orders.length || orders.some((o) => !o)) return { error: "not_found" };
  const list = orders as Order[];
  if (list.some((o) => o.status === "expired")) return { error: "expired" };
  if (list.some((o) => o.status !== "pending_payment")) return { error: "not_payable" };
  if (!enabledMethods(db).includes(method)) return { error: "method_disabled" };
  if (db.payIntents.some((x) => x.status === "review" && x.orderIds.some((id) => orderIds.includes(id)))) return { error: "payment_in_review" };
  const now = new Date();
  for (const x of db.payIntents) {
    if ((x.status === "created" || x.status === "awaiting") && x.orderIds.some((id) => orderIds.includes(id))) {
      x.status = "cancelled";
      x.updatedAt = iso(now);
    }
  }
  let ref = "";
  do ref = `EVL-${code(6)}`;
  while (db.payIntents.some((x) => x.ref === ref));
  const intent: PayIntent = {
    id: `PI-${code(10)}`,
    userId: user.id,
    groupId: list[0].groupId ?? list[0].id,
    orderIds: list.map((o) => o.id),
    mode,
    method,
    amount: list.reduce((s, o) => s + (mode === "full" ? o.total : o.deposit), 0),
    status: "created",
    step: method === "bank" ? "receipt" : "details",
    ref,
    attempts: [],
    channel: {},
    otpTries: 0,
    approveUntil: null,
    receipt: null,
    reviewNote: "",
    reviewedBy: null,
    createdAt: iso(now),
    updatedAt: iso(now),
    expiresAt: iso(new Date(now.getTime() + (method === "bank" ? 48 * 60 : INTENT_MINUTES) * 60000)),
  };
  db.payIntents.push(intent);
  for (const o of list) o.groupId ??= intent.groupId;
  return { intent };
}

/** Wallet step 1: the number. The gateway either refuses it or asks the customer to approve on their phone. */
export function submitWallet(i: PayIntent, number: unknown): { error?: string } {
  const now = new Date();
  if (i.status !== "created" && i.status !== "awaiting") return { error: "intent_closed" };
  if (i.method !== "jazzcash" && i.method !== "easypaisa") return { error: "invalid_input" };
  const r = checkWallet(number);
  if (!r.ok) return fail(i, r.error, now);
  i.channel = { wallet: r.masked };
  i.status = "awaiting";
  i.step = "approve";
  i.otpTries = 0;
  i.approveUntil = iso(new Date(now.getTime() + WALLET_APPROVE_SECONDS * 1000));
  log(i, "wallet_prompted", now);
  return {};
}

/** Card step 1: the card form. A card the issuer would decline fails here; a good one goes on to 3-D Secure. Nothing of the number is kept but brand and last 4. */
export function submitCard(i: PayIntent, body: { number?: unknown; expiry?: unknown; cvv?: unknown; name?: unknown }): { error?: string } {
  const now = new Date();
  if (i.status !== "created" && i.status !== "awaiting") return { error: "intent_closed" };
  if (i.method !== "card") return { error: "invalid_input" };
  const r = checkCard(body, now);
  if (!r.ok) return fail(i, r.error, now);
  i.channel = { brand: r.brand, last4: r.last4 };
  i.status = "awaiting";
  i.step = "otp";
  i.otpTries = 0;
  log(i, "3ds_prompted", now);
  return {};
}

/** Step 2 for wallets (PIN / OTP) and cards (3-D Secure). Three wrong codes end the attempt. */
export function submitOtp(db: DB, i: PayIntent, codeIn: unknown): { error?: string } {
  const now = new Date();
  refreshIntent(i, now);
  if (i.status !== "awaiting" || (i.step !== "otp" && i.step !== "approve")) return { error: i.status === "failed" ? "intent_failed" : "intent_closed" };
  if (!otpOk(codeIn)) {
    i.otpTries += 1;
    log(i, "otp_failed", now);
    if (i.otpTries >= OTP_TRIES) {
      i.status = "failed";
      return { error: "otp_locked" };
    }
    return { error: "otp_failed" };
  }
  const r = settle(db, i, "gateway", now);
  return r === "ok" ? {} : { error: r };
}

/** The money arrived: each order moves to the factory queue. Safe to call twice. Gateway payments are confirmed by the gateway itself;
 *  a bank transfer is confirmed by the staff member who checked the receipt (`by`). */
export function settle(db: DB, i: PayIntent, by: string, now = new Date()): "ok" | "order_unavailable" {
  if (i.status === "succeeded") return "ok";
  const orders = ordersOf(db, i);
  if (!orders.length || orders.some((o) => o.status !== "pending_payment")) {
    i.status = "failed";
    log(i, "order_unavailable", now);
    return "order_unavailable";
  }
  for (const o of orders) {
    const share = i.mode === "full" ? o.total : o.deposit;
    o.payment = { method: i.method, ref: i.ref, amount: share, paidAt: iso(now), verified: true, verifiedAt: iso(now), verifiedBy: by, intentId: i.id, mode: i.mode, ...(i.channel.brand ? { brand: i.channel.brand } : {}), ...(i.channel.last4 ? { last4: i.channel.last4 } : {}) };
    o.status = "active";
    o.stage = 1;
    o.stageTimes[1] = iso(now);
    o.eta = iso(new Date(now.getTime() + daysRemaining(1) * 86400000));
    o.history.push({ at: iso(now), by: by === "gateway" ? "customer" : by, action: `payment.${i.method}` });
  }
  i.status = "succeeded";
  i.step = "details";
  log(i, "ok", now);
  const user = db.users.find((u) => u.id === i.userId);
  notify(db, "payment.received", { name: orders[0].contact.name, phone: orders[0].contact.phone, email: user?.email }, { amount: pkr(i.amount, "en"), method: METHOD_NAME[i.method], ref: i.ref, orders: orders.map((o) => o.id).join(", ") }, i.id);
  return "ok";
}

/** Bank transfer: the customer's receipt arrived. It waits for staff, and the orders do not expire while it does. */
export function receiptArrived(db: DB, i: PayIntent, file: string): { error?: string } {
  const now = new Date();
  if (i.method !== "bank") return { error: "invalid_input" };
  if (i.status !== "created" && i.status !== "awaiting") return { error: "intent_closed" };
  i.receipt = file;
  i.status = "review";
  i.step = "receipt";
  log(i, "receipt_uploaded", now);
  const user = db.users.find((u) => u.id === i.userId);
  const first = ordersOf(db, i)[0];
  if (first) notify(db, "payment.review", { name: first.contact.name, phone: first.contact.phone, email: user?.email }, { amount: pkr(i.amount, "en"), ref: i.ref }, i.id);
  return {};
}

/** Staff decision on a bank transfer. */
export function decideReceipt(db: DB, i: PayIntent, approve: boolean, note: string, by: string): "ok" | "not_in_review" | "order_unavailable" {
  if (i.status !== "review") return "not_in_review";
  const now = new Date();
  i.reviewedBy = by;
  i.reviewNote = note;
  if (approve) {
    const r = settle(db, i, by, now);
    return r;
  }
  i.status = "failed";
  log(i, "rejected", now, note);
  const user = db.users.find((u) => u.id === i.userId);
  const first = ordersOf(db, i)[0];
  if (first) notify(db, "payment.rejected", { name: first.contact.name, phone: first.contact.phone, email: user?.email }, { amount: pkr(i.amount, "en"), ref: i.ref, reason: note || "the receipt could not be matched" }, i.id);
  return "ok";
}

/** True while a bank transfer for the order is being checked: the order must not expire under it. */
export const inReview = (db: DB, orderId: string) => db.payIntents.some((x) => x.status === "review" && x.orderIds.includes(orderId));
