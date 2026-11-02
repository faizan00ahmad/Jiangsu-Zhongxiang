import { LAST_STAGE, STAGES } from "@/lib/catalog";
import { pkr } from "@/lib/format";
import { audit, guard, setStage } from "@/lib/server/admin";
import { releaseCoupon } from "@/lib/server/coupons";
import { mutate, releaseUnit } from "@/lib/server/db";
import { fail, int, ok, readJson, str } from "@/lib/server/http";
import { notify } from "@/lib/server/notify";
import type { DB, Order } from "@/lib/types";

function tell(db: DB, o: Order, event: string, extra: Record<string, string> = {}) {
  const u = db.users.find((x) => x.id === o.userId);
  notify(
    db,
    event,
    { name: o.contact.name, phone: o.contact.phone, email: u?.email },
    { order: o.id, model: o.modelName, deposit: pkr(o.deposit, "en"), stage: STAGES[o.stage].title.en, eta: o.eta ? new Date(o.eta).toISOString().slice(0, 10) : "—", ...extra },
    o.id,
  );
}

/** Manual order sync from the back office: verify deposit, move stages, shipment details, ETA, pickup, cancel, internal notes.
 *  Dealer-scoped roles may only act on orders for their own store, and only on the last delivery steps. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guard("orders.edit");
  if (g.res) return g.res;
  const { admin } = g;
  const b = await readJson(req);
  if (!b) return fail("invalid_input");
  const { id } = await ctx.params;
  const by = admin.username;
  const dealer = admin.scope === "dealer";
  const res = await mutate((db) => {
    const o = db.orders.find((x) => x.id === id);
    if (!o || (dealer && o.contact.dealerId !== admin.dealerId)) return "not_found";
    const now = new Date().toISOString();
    const dealerOk = (stage: number) => !dealer || stage >= LAST_STAGE - 1;
    switch (b.action) {
      case "verify":
        if (dealer) return "forbidden";
        if (!o.payment) return "not_paid";
        o.payment.verified = true;
        o.payment.verifiedAt = now;
        o.payment.verifiedBy = by;
        o.history.push({ at: now, by, action: "payment.verified" });
        audit(db, admin, "verify", "orders", o.id, "advance payment verified");
        tell(db, o, "payment.verified");
        return "ok";
      case "stage": {
        const s = int(b.stage, 1, LAST_STAGE);
        if (s === null || o.status !== "active" || !o.payment) return "invalid_stage";
        if (!dealerOk(s)) return "forbidden";
        const eta = typeof b.eta === "string" && !Number.isNaN(Date.parse(b.eta)) ? new Date(b.eta).toISOString() : null;
        setStage(o, s, by, eta);
        audit(db, admin, "stage", "orders", o.id, `→ ${STAGES[s].title.en}`);
        tell(db, o, "stage.changed");
        return "ok";
      }
      case "shipment": {
        if (dealer) return "forbidden";
        o.trackingNo = str(b.trackingNo, 40) || null;
        o.carrier = str(b.carrier, 80) || null;
        if (typeof b.eta === "string") o.eta = b.eta && !Number.isNaN(Date.parse(b.eta)) ? new Date(b.eta).toISOString() : o.eta;
        o.history.push({ at: now, by, action: "shipment.updated" });
        audit(db, admin, "update", "orders", o.id, `shipment ${o.trackingNo ?? ""}`);
        return "ok";
      }
      case "complete":
        if (o.status !== "active" || o.stage !== LAST_STAGE) return "invalid_stage";
        o.status = "completed";
        o.history.push({ at: now, by, action: "order.completed" });
        audit(db, admin, "complete", "orders", o.id, "picked up");
        return "ok";
      case "cancel":
        if (dealer) return "forbidden";
        if (o.status !== "pending_payment" && o.status !== "active") return "invalid_stage";
        if (o.stage <= 1) releaseUnit(db, o); // unit not yet built; later stages keep it allocated
        else releaseCoupon(db, o);
        o.status = "cancelled";
        o.history.push({ at: now, by, action: "order.cancelled" });
        audit(db, admin, "cancel", "orders", o.id, "cancelled by staff");
        tell(db, o, "order.cancelled");
        return "ok";
      case "pickup": {
        if (dealer) return "forbidden";
        const d = db.dealers.find((x) => x.id === str(b.dealerId, 40) && x.enabled);
        if (!d) return "invalid_input";
        if (o.status === "cancelled" || o.status === "expired" || o.status === "completed") return "invalid_stage";
        o.contact.dealerId = d.id;
        o.contact.city = d.city;
        o.history.push({ at: now, by, action: `pickup.${d.id}` });
        audit(db, admin, "assign", "orders", o.id, `pickup store ${d.name.en}`);
        const u = db.users.find((x) => x.id === o.userId);
        notify(db, "pickup.chosen", { name: o.contact.name, phone: o.contact.phone, email: u?.email }, { order: o.id, model: o.modelName, store: d.name.en }, o.id);
        return "ok";
      }
      case "note": {
        const text = str(b.text, 600);
        if (!text) return "required";
        (o.notes ??= []).push({ at: now, by, text });
        audit(db, admin, "note", "orders", o.id, text.slice(0, 80));
        return "ok";
      }
      default:
        return "invalid_input";
    }
  });
  return res === "ok" ? ok() : fail(res, res === "not_found" ? 404 : res === "forbidden" ? 403 : res === "required" || res === "invalid_input" ? 400 : 409);
}
