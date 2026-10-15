import { mutate } from "@/lib/server/db";
import { fail, ok, sameOrigin } from "@/lib/server/http";
import { currentUser } from "@/lib/server/session";

/** Removes a quotation from the customer's history (kept if an order references it). */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return fail("invalid_input", 403);
  const user = await currentUser();
  if (!user) return fail("unauthorized", 401);
  const { id } = await ctx.params;
  const res = await mutate((db) => {
    const q = db.quotes.find((x) => x.id === id && x.userId === user.id);
    if (!q) return "not_found";
    if (db.orders.some((o) => o.quoteId === id)) q.label = null;
    else db.quotes = db.quotes.filter((x) => x !== q);
    return "ok";
  });
  return res === "ok" ? ok() : fail(res, 404);
}
