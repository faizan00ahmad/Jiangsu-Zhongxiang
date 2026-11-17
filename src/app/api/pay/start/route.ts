import { mutate } from "@/lib/server/db";
import { fail, ok, readJson, sameOrigin, str } from "@/lib/server/http";
import { openIntent } from "@/lib/server/payments";
import { currentUser } from "@/lib/server/session";
import type { PayMethod, PayMode } from "@/lib/types";

const METHODS: PayMethod[] = ["jazzcash", "easypaisa", "card", "bank"];

/** Pay (again) for orders that still wait for their advance: from the order page, or after a failed attempt. POST {orderId | groupId, method, mode} */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("invalid_input", 403);
  const user = await currentUser();
  if (!user) return fail("unauthorized", 401);
  const b = await readJson(req);
  const method = METHODS.find((m) => m === b?.method);
  if (!b || !method) return fail("method_required");
  const mode: PayMode = b.mode === "full" ? "full" : "advance";
  const orderId = str(b.orderId, 30);
  const groupId = str(b.groupId, 30);
  if (!orderId && !groupId) return fail("invalid_input");
  const res = await mutate((db): { error: string } | { id: string } => {
    const mine = db.orders.filter((o) => o.userId === user.id && o.status === "pending_payment");
    // an order without a checkout group is its own group
    const ids = groupId ? mine.filter((o) => o.groupId === groupId).map((o) => o.id) : mine.filter((o) => o.id === orderId).map((o) => o.id);
    if (!ids.length) return { error: "not_payable" };
    const u = db.users.find((x) => x.id === user.id);
    if (!u) return { error: "unauthorized" };
    const r = openIntent(db, u, ids, method, mode);
    return "error" in r ? { error: r.error } : { id: r.intent.id };
  });
  if ("error" in res) return fail(res.error, 409);
  return ok(res);
}
