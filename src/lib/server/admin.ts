import { redirect } from "next/navigation";
import { daysRemaining, LAST_STAGE } from "../catalog";
import type { AdminCtx, DB, Order } from "../types";
import { randomId } from "./crypto";
import { fail } from "./http";
import { can, currentAdmin } from "./session";

/** Returns the signed-in admin if their role holds `perm` ("orders.edit", or "orders" for any action), else an error response to return as-is. */
export async function guard(perm: string): Promise<{ admin: AdminCtx; res?: undefined } | { admin?: undefined; res: Response }> {
  const admin = await currentAdmin();
  if (!admin) return { res: fail("forbidden", 401) };
  if (!can(admin, perm)) return { res: fail("forbidden", 403) };
  return { admin };
}

/** For admin pages: the admin if allowed to open `perm`, otherwise back to the dashboard. */
export async function pageGuard(perm: string): Promise<AdminCtx> {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");
  if (!can(admin, perm.includes(".") ? perm : `${perm}.view`)) redirect("/admin");
  return admin;
}

/** Dealer-scoped roles only ever see orders picked up at their own store. */
export const visibleOrders = (db: DB, a: AdminCtx) => (a.scope === "dealer" ? db.orders.filter((o) => o.contact.dealerId === a.dealerId) : db.orders);

/** Appends to the audit log (newest last, capped). Call inside `mutate` so the entry is saved with the change. */
export function audit(db: DB, admin: Pick<AdminCtx, "id" | "name">, action: string, entity: string, entityId: string, summary = "") {
  db.audit.push({ id: randomId(6), at: new Date().toISOString(), adminId: admin.id, adminName: admin.name, action, entity, entityId, summary: summary.slice(0, 240) });
  if (db.audit.length > 5000) db.audit.splice(0, db.audit.length - 5000);
}

/** Moves an order to `stage`, stamping times; later stamps are cleared when stepping back. ETA recalculates unless given. */
export function setStage(o: Order, stage: number, by: string, eta?: string | null) {
  const now = new Date();
  for (let i = stage + 1; i <= LAST_STAGE; i++) o.stageTimes[i] = null;
  o.stageTimes[stage] ??= now.toISOString();
  o.stage = stage;
  o.eta = eta ?? (stage === LAST_STAGE ? o.stageTimes[stage] : new Date(now.getTime() + daysRemaining(stage) * 86400000).toISOString());
  o.history.push({ at: now.toISOString(), by, action: `stage.${stage}` });
}
