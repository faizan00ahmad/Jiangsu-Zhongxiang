import { NextResponse } from "next/server";

/** Every error carries a stable code; the browser shows the matching bilingual message from the dictionary. */
export const fail = (code: string, status = 400) => NextResponse.json({ ok: false, error: code }, { status });
export const ok = <T extends object>(data: T = {} as T) => NextResponse.json({ ok: true, ...data });

/** Mutating requests must be same-origin JSON (or multipart for uploads) — blocks cross-site form posts. */
export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T | null> {
  if (!sameOrigin(req)) return null;
  if (!req.headers.get("content-type")?.includes("application/json")) return null;
  try {
    const v = await req.json();
    return v && typeof v === "object" ? (v as T) : null;
  } catch {
    return null;
  }
}

export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === (req.headers.get("x-forwarded-host") ?? req.headers.get("host"));
  } catch {
    return false;
  }
}

export const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
export const int = (v: unknown, min = 0, max = 1e9) => {
  const x = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(x) ? Math.min(max, Math.max(min, Math.round(x))) : null;
};

/** Pakistani mobile: 03XXXXXXXXX, +923XXXXXXXXX or 923XXXXXXXXX → stored as 03XXXXXXXXX. */
export function normalizePhone(v: unknown) {
  const d = str(v, 30).replace(/[\s-]/g, "");
  const m = d.match(/^(?:\+?92|0)(3\d{9})$/);
  return m ? `0${m[1]}` : null;
}

/** Small in-memory throttle for login endpoints (per process). */
const hits = new Map<string, { n: number; t: number }>();
export function throttled(key: string, limit = 8, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || now - h.t > windowMs) {
    hits.set(key, { n: 1, t: now });
    return false;
  }
  h.n++;
  return h.n > limit;
}
/** Only same-site relative paths are allowed as post-login destinations (no open redirects). */
export const safeNext = (v: unknown, fallback: string) => (typeof v === "string" && /^\/(?![/\\])[\w\-/?=&.%]*$/.test(v) ? v : fallback);

export const clientIp =(req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
