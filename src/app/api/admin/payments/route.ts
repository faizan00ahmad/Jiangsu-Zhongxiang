import { audit, guard } from "@/lib/server/admin";
import { mutate } from "@/lib/server/db";
import { fail, ok, readJson, str } from "@/lib/server/http";
import { decideReceipt } from "@/lib/server/payments";

/** PATCH {id, action: "approve" | "reject", note?}: staff decision on a bank transfer receipt.
 *  Approving moves every order of the checkout into the factory queue and tells the customer; rejecting tells them why and lets them pay again. */
export async function PATCH(req: Request) {
  const g = await guard("payments.edit");
  if (g.res) return g.res;
  if (g.admin.scope === "dealer") return fail("forbidden", 403);
  const b = await readJson(req);
  const id = str(b?.id, 30);
  if (!b || !id || (b.action !== "approve" && b.action !== "reject")) return fail("invalid_input");
  const note = str(b.note, 300);
  if (b.action === "reject" && !note) return fail("reason_required");
  const res = await mutate((db) => {
    const i = db.payIntents.find((x) => x.id === id);
    if (!i) return "not_found";
    const r = decideReceipt(db, i, b.action === "approve", note, g.admin.username);
    if (r === "ok") audit(db, g.admin, b.action === "approve" ? "approve" : "reject", "payments", i.id, `${i.ref} · PKR ${i.amount}`);
    return r;
  });
  return res === "ok" ? ok() : fail(res, res === "not_found" ? 404 : 409);
}
