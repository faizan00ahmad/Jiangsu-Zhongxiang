import { mutate, releaseUnit } from "@/lib/server/db";
import { fail, ok, sameOrigin } from "@/lib/server/http";
import { currentUser } from "@/lib/server/session";

/** Customers can cancel only before paying the deposit; the reserved factory unit goes back to stock. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return fail("invalid_input", 403);
  const user = await currentUser();
  if (!user) return fail("unauthorized", 401);
  const { id } = await ctx.params;
  const res = await mutate((db) => {
    const o = db.orders.find((x) => x.id === id && x.userId === user.id);
    if (!o) return "not_found";
    if (o.status !== "pending_payment") return "not_cancellable";
    o.status = "cancelled";
    o.history.push({ at: new Date().toISOString(), by: "customer", action: "order.cancelled" });
    releaseUnit(db, o);
    return "ok";
  });
  return res === "ok" ? ok() : fail(res, res === "not_found" ? 404 : 409);
}
