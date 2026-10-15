import { daysRemaining } from "@/lib/catalog";
import { code } from "@/lib/server/crypto";
import { mutate } from "@/lib/server/db";
import { fail, ok, readJson } from "@/lib/server/http";
import { currentUser } from "@/lib/server/session";
import type { PayMethod } from "@/lib/types";

const METHODS: PayMethod[] = ["jazzcash", "easypaisa", "bank", "card"];

/** Advance payment. The gateway call is a sandbox stand-in: plug the JazzCash / Easypaisa / bank merchant API in here.
 *  On success the order activates automatically and moves to Factory Preparation. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const b = await readJson(req);
  if (!b) return fail("invalid_input");
  const user = await currentUser();
  if (!user) return fail("unauthorized", 401);
  const method = METHODS.find((m) => m === b.method);
  if (!method) return fail("invalid_input");
  const { id } = await ctx.params;
  const res = await mutate((db) => {
    const o = db.orders.find((x) => x.id === id && x.userId === user.id);
    if (!o) return "not_found";
    if (o.status === "expired") return "expired";
    if (o.status !== "pending_payment") return "not_payable";
    const now = new Date();
    o.payment = { method, ref: `PAY-${code(8)}`, amount: o.deposit, paidAt: now.toISOString(), verified: false, verifiedAt: null, verifiedBy: null };
    o.status = "active";
    o.stage = 1;
    o.stageTimes[1] = now.toISOString();
    o.eta = new Date(now.getTime() + daysRemaining(1) * 86400000).toISOString();
    o.history.push({ at: now.toISOString(), by: "customer", action: `payment.${method}` });
    return "ok";
  });
  return res === "ok" ? ok() : fail(res, res === "not_found" ? 404 : 409);
}
