import crypto from "node:crypto";

export function hashPassword(pw: string) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(pw, salt, 32);
  return `s1$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export function verifyPassword(pw: string, stored: string) {
  const [v, s, h] = stored.split("$");
  if (v !== "s1" || !s || !h) return false;
  const expected = Buffer.from(h, "base64url");
  const got = crypto.scryptSync(pw, Buffer.from(s, "base64url"), expected.length);
  return crypto.timingSafeEqual(expected, got);
}

export function signToken(payload: Record<string, unknown>, secret: string) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function readToken<T>(token: string | undefined, secret: string): T | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = crypto.createHmac("sha256", secret).update(body).digest();
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString()) as T & { exp?: number };
    if (p.exp && p.exp < Date.now()) return null;
    return p;
  } catch {
    return null;
  }
}

/** Unambiguous upper-case code (no 0/O/1/I) for order numbers and payment refs. */
export function code(len: number) {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const b = crypto.randomBytes(len);
  return Array.from(b, (x) => A[x % A.length]).join("");
}
export const randomId = (bytes = 12) => crypto.randomBytes(bytes).toString("base64url");
