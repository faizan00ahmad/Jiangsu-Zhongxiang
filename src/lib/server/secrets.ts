import crypto from "node:crypto";
import type { Integrations } from "../types";

/** Integration keys are stored encrypted (AES-256-GCM, key derived from the session secret) and shown masked. */

const key = (secret: string) => crypto.createHash("sha256").update(`zx-secrets:${secret}`).digest();

export function seal(plain: string, secret: string) {
  if (!plain) return "";
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key(secret), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return `enc1:${iv.toString("base64url")}:${c.getAuthTag().toString("base64url")}:${enc.toString("base64url")}`;
}

export function unseal(stored: string, secret: string) {
  if (!stored.startsWith("enc1:")) return stored;
  const [, iv, tag, data] = stored.split(":");
  try {
    const d = crypto.createDecipheriv("aes-256-gcm", key(secret), Buffer.from(iv, "base64url"));
    d.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([d.update(Buffer.from(data, "base64url")), d.final()]).toString("utf8");
  } catch {
    return "";
  }
}

export const MASK = "••••••••";
export const masked = (stored: string) => (stored ? MASK : "");

/** Which fields of the integrations object hold secrets (everything else is plain). */
const SECRET_PATHS = ["payments.jazzcash.secret", "payments.easypaisa.secret", "social.google.secret", "social.facebook.secret", "sms.apiKey", "meta.capiToken", "smtp.pass"];

const get = (o: unknown, p: string) => p.split(".").reduce<unknown>((a, k) => (a as Record<string, unknown>)?.[k], o);
function set(o: unknown, p: string, v: unknown) {
  const ks = p.split(".");
  const last = ks.pop()!;
  const t = ks.reduce<Record<string, unknown>>((a, k) => a[k] as Record<string, unknown>, o as Record<string, unknown>);
  t[last] = v;
}

/** A copy safe to send to the browser: every secret replaced by a mask (or empty when unset). */
export function maskIntegrations(i: Integrations): Integrations {
  const out = structuredClone(i);
  for (const p of SECRET_PATHS) set(out, p, masked(String(get(i, p) ?? "")));
  return out;
}

/** Merges what the browser sent into the stored settings: a mask means "unchanged", anything else is sealed. */
export function mergeIntegrations(stored: Integrations, input: Integrations, secret: string): Integrations {
  const out = structuredClone(input);
  for (const p of SECRET_PATHS) {
    const sent = String(get(input, p) ?? "");
    set(out, p, sent === MASK ? String(get(stored, p) ?? "") : seal(sent, secret));
  }
  return out;
}
