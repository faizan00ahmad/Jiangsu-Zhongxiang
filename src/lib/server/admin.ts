import { redirect } from "next/navigation";
import { daysRemaining, LAST_STAGE } from "../catalog";
import type { Admin, DB, Order } from "../types";
import { fail } from "./http";
import { can, currentAdmin } from "./session";

/** Returns the signed-in admin if their role may use `area`, else an error response to return as-is. */
export async function guard(area: string): Promise<{ admin: Admin; res?: undefined } | { admin?: undefined; res: Response }> {
  const admin = await currentAdmin();
  if (!admin) return { res: fail("forbidden", 401) };
  if (!can(admin, area)) return { res: fail("forbidden", 403) };
  return { admin };
}

/** For admin pages: the admin if allowed into `area`, otherwise back to the dashboard. */
export async function pageGuard(area: string): Promise<Admin> {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");
  if (!can(admin, area)) redirect("/admin");
  return admin;
}

/** Dealers only ever see orders picked up at their own store. */
export const visibleOrders = (db: DB, a: Admin) => (a.role === "dealer" ? db.orders.filter((o) => o.contact.dealerId === a.dealerId) : db.orders);

/** Moves an order to `stage`, stamping times; later stamps are cleared when stepping back. ETA recalculates unless given. */
export function setStage(o: Order, stage: number, by: string, eta?: string | null) {
  const now = new Date();
  for (let i = stage + 1; i <= LAST_STAGE; i++) o.stageTimes[i] = null;
  o.stageTimes[stage] ??= now.toISOString();
  o.stage = stage;
  o.eta = eta ?? (stage === LAST_STAGE ? o.stageTimes[stage] : new Date(now.getTime() + daysRemaining(stage) * 86400000).toISOString());
  o.history.push({ at: now.toISOString(), by, action: `stage.${stage}` });
}
