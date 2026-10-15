import { LAST_STAGE } from "@/lib/catalog";
import { guard, setStage } from "@/lib/server/admin";
import { mutate, releaseUnit } from "@/lib/server/db";
import { fail, int, ok, readJson, str } from "@/lib/server/http";

/** Manual order sync from the back office: verify deposit, move stages, shipment details, ETA, pickup, cancel.
 *  Dealers may only act on orders for their own store, and only on the last delivery steps. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guard("orders");
  if (g.res) return g.res;
  const { admin } = g;
  const b = await readJson(req);
  if (!b) return fail("invalid_input");
  const { id } = await ctx.params;
  const by = admin.username;
  const res = await mutate((db) => {
    const o = db.orders.find((x) => x.id === id);
    if (!o || (admin.role === "dealer" && o.contact.dealerId !== admin.dealerId)) return "not_found";
    const now = new Date().toISOString();
    const dealerOk = (stage: number) => admin.role !== "dealer" || stage >= LAST_STAGE - 1;
    switch (b.action) {
      case "verify":
        if (admin.role === "dealer") return "forbidden";
        if (!o.payment) return "not_paid";
        o.payment.verified = true;
        o.payment.verifiedAt = now;
        o.payment.verifiedBy = by;
        o.history.push({ at: now, by, action: "payment.verified" });
        return "ok";
      case "stage": {
        const s = int(b.stage, 1, LAST_STAGE);
        if (s === null || o.status !== "active" || !o.payment) return "invalid_stage";
        if (!dealerOk(s)) return "forbidden";
        const eta = typeof b.eta === "string" && !Number.isNaN(Date.parse(b.eta)) ? new Date(b.eta).toISOString() : null;
        setStage(o, s, by, eta);
        return "ok";
      }
      case "shipment": {
        if (admin.role === "dealer") return "forbidden";
        o.trackingNo = str(b.trackingNo, 40) || null;
        o.carrier = str(b.carrier, 80) || null;
        if (typeof b.eta === "string") o.eta = b.eta && !Number.isNaN(Date.parse(b.eta)) ? new Date(b.eta).toISOString() : o.eta;
        o.history.push({ at: now, by, action: "shipment.updated" });
        return "ok";
      }
      case "complete":
        if (o.status !== "active" || o.stage !== LAST_STAGE) return "invalid_stage";
        o.status = "completed";
        o.history.push({ at: now, by, action: "order.completed" });
        return "ok";
      case "cancel":
        if (admin.role === "dealer") return "forbidden";
        if (o.status !== "pending_payment" && o.status !== "active") return "invalid_stage";
        if (o.stage <= 1) releaseUnit(db, o); // unit not yet built; later stages keep it allocated
        o.status = "cancelled";
        o.history.push({ at: now, by, action: "order.cancelled" });
        return "ok";
      default:
        return "invalid_input";
    }
  });
  return res === "ok" ? ok() : fail(res, res === "not_found" ? 404 : res === "forbidden" ? 403 : 409);
}
