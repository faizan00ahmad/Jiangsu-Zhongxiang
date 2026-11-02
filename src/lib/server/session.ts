import { cookies } from "next/headers";
import { has } from "../perms";
import type { Admin, AdminCtx, AdminLang, Lang, User } from "../types";
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

/** The signed-in admin with the permissions of their role resolved. A role that was deleted leaves its admins with no access. */
export async function currentAdmin(): Promise<AdminCtx | null> {
  const p = readToken<{ aid: string }>((await cookies()).get(ADMIN_COOKIE)?.value, await secretOf());
  if (!p) return null;
  const db = await getDb();
  const a = db.admins.find((x) => x.id === p.aid);
  if (!a || a.disabled) return null;
  const role = db.roles.find((r) => r.id === a.role);
  return { ...a, perms: role?.perms ?? [], scope: role?.scope ?? "dealer" };
}

/** `can(admin, "orders.edit")`, or `can(admin, "orders")` for "any action on orders". */
export const can = (a: AdminCtx | null, perm: string) => !!a && has(a.perms, perm);

/** Public view of a user/admin — never send password hashes to the browser. */
export const publicUser = (u: User) => ({ id: u.id, name: u.name, phone: u.phone, email: u.email, city: u.city, createdAt: u.createdAt });
export const publicAdmin = (a: Admin) => ({ id: a.id, username: a.username, name: a.name, role: a.role, dealerId: a.dealerId, createdAt: a.createdAt, disabled: a.disabled });
