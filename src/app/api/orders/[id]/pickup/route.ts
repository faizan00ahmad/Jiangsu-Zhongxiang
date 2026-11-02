import { PICKUP_LOCK_STAGE } from "@/lib/catalog";
import { mutate } from "@/lib/server/db";
import { fail, ok, readJson, str } from "@/lib/server/http";
import { notify } from "@/lib/server/notify";
import { currentUser } from "@/lib/server/session";

/** The customer picks (or changes) the store where they will collect the vehicle. This happens after the order is placed. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const b = await readJson(req);
  if (!b) return fail("invalid_input");
  const user = await currentUser();
  if (!user) return fail("unauthorized", 401);
  const { id } = await ctx.params;
  const dealerId = str(b.dealerId, 40);
  const res = await mutate((db) => {
    const o = db.orders.find((x) => x.id === id && x.userId === user.id);
    if (!o) return "not_found";
    if (o.status === "cancelled" || o.status === "expired" || o.status === "completed") return "store_locked";
    if (o.stage >= PICKUP_LOCK_STAGE) return "store_locked";
    const d = db.dealers.find((x) => x.id === dealerId && x.enabled);
    if (!d) return "bad_store";
    const changed = o.contact.dealerId !== d.id;
    o.contact.dealerId = d.id;
    o.contact.city = d.city;
    if (changed) {
      o.history.push({ at: new Date().toISOString(), by: "customer", action: `pickup.${d.id}` });
      notify(db, "pickup.chosen", { name: o.contact.name, phone: o.contact.phone, email: user.email }, { order: o.id, model: o.modelName, store: d.name.en }, o.id);
    }
    return "ok";
  });
  return res === "ok" ? ok() : fail(res, res === "not_found" ? 404 : res === "store_locked" ? 409 : 400);
}
