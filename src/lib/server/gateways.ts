import { normalizePhone } from "./http";
import type { DB, PayMethod } from "../types";

/** Payment methods the customer may use now.
 *  Wallets and card follow their switch in Admin > Integrations, and only while they run in sandbox: no live gateway adapter is installed yet,
 *  so a method switched to "live" is hidden instead of failing at the last step. Bank transfer follows its own switch. */
export function enabledMethods(db: DB): PayMethod[] {
  const p = db.integrations.payments;
  const out: PayMethod[] = [];
  if (p.jazzcash.enabled && p.jazzcash.mode === "sandbox") out.push("jazzcash");
  if (p.easypaisa.enabled && p.easypaisa.mode === "sandbox") out.push("easypaisa");
  if (p.card.enabled && p.card.mode === "sandbox") out.push("card");
  if (p.bank.enabled) out.push("bank");
  return out;
}

/* ───────────────────────── sandbox gateways ─────────────────────────
 * One small adapter per method. Each takes what the customer typed and says what the gateway would answer. When a merchant account exists,
 * a live adapter with the same shape replaces the sandbox one; the pages, orders and admin screens do not change. */

/** The only secret a sandbox accepts for wallet approval and 3-D Secure. Shown on the sandbox pages themselves. */
export const SANDBOX_OTP = "123456";
export const OTP_TRIES = 3;
export const WALLET_APPROVE_SECONDS = 120;
export const INTENT_MINUTES = 30;

export type CardBrand = "visa" | "mastercard" | "paypak";
export const TEST_CARDS: { number: string; brand: CardBrand; result: "ok" | "declined" | "insufficient" }[] = [
  { number: "4242424242424242", brand: "visa", result: "ok" },
  { number: "5555555555554444", brand: "mastercard", result: "ok" },
  { number: "2205000000000009", brand: "paypak", result: "ok" },
  { number: "4000000000000002", brand: "visa", result: "declined" },
  { number: "4000000000009995", brand: "visa", result: "insufficient" },
];

const digits = (v: unknown) => (typeof v === "string" ? v.replace(/[\s-]/g, "") : "");

export function luhn(pan: string) {
  if (!/^\d{12,19}$/.test(pan)) return false;
  let sum = 0;
  let alt = false;
  for (let i = pan.length - 1; i >= 0; i--) {
    let n = Number(pan[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export function cardBrand(pan: string): CardBrand | null {
  if (/^4/.test(pan)) return "visa";
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(pan) && !/^2205/.test(pan)) return "mastercard";
  if (/^(2205|9)/.test(pan)) return "paypak";
  return null;
}

export type CardCheck = { ok: true; brand: CardBrand; last4: string } | { ok: false; error: "card_invalid" | "card_expired" | "card_cvv" | "card_name" | "card_not_test" | "card_declined" | "card_insufficient" };

/** What a card gateway answers to the card form. Success means "now do 3-D Secure". The number and CVV are used here and never stored or logged. */
export function checkCard(input: { number?: unknown; expiry?: unknown; cvv?: unknown; name?: unknown }, now = new Date()): CardCheck {
  const pan = digits(input.number);
  const brand = cardBrand(pan);
  if (!brand || !luhn(pan)) return { ok: false, error: "card_invalid" };
  const m = typeof input.expiry === "string" ? input.expiry.replace(/\s/g, "").match(/^(0[1-9]|1[0-2])\/(\d{2})$/) : null;
  if (!m) return { ok: false, error: "card_expired" };
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (year < now.getUTCFullYear() || (year === now.getUTCFullYear() && month < now.getUTCMonth() + 1) || year > now.getUTCFullYear() + 20) return { ok: false, error: "card_expired" };
  if (!/^\d{3}$/.test(digits(input.cvv))) return { ok: false, error: "card_cvv" };
  if (typeof input.name !== "string" || input.name.trim().length < 2) return { ok: false, error: "card_name" };
  // a sandbox is not a place for real card numbers: only the published test cards are accepted
  const test = TEST_CARDS.find((c) => c.number === pan);
  if (!test) return { ok: false, error: "card_not_test" };
  if (test.result === "declined") return { ok: false, error: "card_declined" };
  if (test.result === "insufficient") return { ok: false, error: "card_insufficient" };
  return { ok: true, brand, last4: pan.slice(-4) };
}

export type WalletCheck = { ok: true; masked: string } | { ok: false; error: "wallet_invalid" | "wallet_inactive" | "wallet_insufficient" };

/** What a wallet answers to a mobile number: unknown number, empty wallet, or "approve this on your phone". */
export function checkWallet(number: unknown): WalletCheck {
  const phone = normalizePhone(number);
  if (!phone) return { ok: false, error: "wallet_invalid" };
  const local = phone.replace(/^\+?92/, "0");
  const masked = `${local.slice(0, 4)} ••• ${local.slice(-4)}`;
  if (local.endsWith("9999")) return { ok: false, error: "wallet_inactive" };
  if (local.endsWith("0000")) return { ok: false, error: "wallet_insufficient" };
  return { ok: true, masked };
}

export const otpOk = (code: unknown) => typeof code === "string" && code.trim() === SANDBOX_OTP;
