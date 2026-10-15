import { cookies } from "next/headers";
import { ROLE_ACCESS } from "../roles";
import type { Admin, AdminLang, Lang, User } from "../types";
import { readToken, signToken } from "./crypto";
import { getDb } from "./db";

const USER_COOKIE = "zx_s";
const ADMIN_COOKIE = "zx_a";
export const LANG_COOKIE = "zx_lang";
export const ADMIN_LANG_COOKIE = "zx_admin_lang";

const secretOf = async () => process.env.SESSION_SECRET || (await getDb()).secret;
const cookieBase = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };

export async function getLang(): Promise<Lang> {
  return (await cookies()).get(LANG_COOKIE)?.value === "ur" ? "ur" : "en";
}
export async function getAdminLang(): Promise<AdminLang> {
  return (await cookies()).get(ADMIN_LANG_COOKIE)?.value === "en" ? "en" : "zh";
}

export async function startUserSession(userId: string) {
  const days = 30;
  const token = signToken({ uid: userId, exp: Date.now() + days * 86400000 }, await secretOf());
  (await cookies()).set(USER_COOKIE, token, { ...cookieBase, maxAge: days * 86400 });
}
export async function startAdminSession(adminId: string) {
  const hours = 12;
  const token = signToken({ aid: adminId, exp: Date.now() + hours * 3600000 }, await secretOf());
  (await cookies()).set(ADMIN_COOKIE, token, { ...cookieBase, maxAge: hours * 3600 });
}
export async function endUserSession() {
  (await cookies()).delete(USER_COOKIE);
}
export async function endAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}

export async function currentUser(): Promise<User | null> {
  const p = readToken<{ uid: string }>((await cookies()).get(USER_COOKIE)?.value, await secretOf());
  if (!p) return null;
  const u = (await getDb()).users.find((x) => x.id === p.uid);
  return u && !u.disabled ? u : null;
}

export async function currentAdmin(): Promise<Admin | null> {
  const p = readToken<{ aid: string }>((await cookies()).get(ADMIN_COOKIE)?.value, await secretOf());
  if (!p) return null;
  const a = (await getDb()).admins.find((x) => x.id === p.aid);
  return a && !a.disabled ? a : null;
}

export const can = (a: Admin | null, area: string) => !!a && ROLE_ACCESS[a.role].includes(area);

/** Public view of a user/admin — never send password hashes to the browser. */
export const publicUser = (u: User) => ({ id: u.id, name: u.name, phone: u.phone, email: u.email, city: u.city, createdAt: u.createdAt });
export const publicAdmin = (a: Admin) => ({ id: a.id, username: a.username, name: a.name, role: a.role, dealerId: a.dealerId, createdAt: a.createdAt, disabled: a.disabled });
