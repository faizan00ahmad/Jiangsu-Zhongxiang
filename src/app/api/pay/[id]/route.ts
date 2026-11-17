import { getDb, mutate } from "@/lib/server/db";
import { fail, ok } from "@/lib/server/http";
import { intentView, refreshIntent } from "@/lib/server/payments";
import { currentUser } from "@/lib/server/session";

/** Where a payment attempt stands. Polled by the payment page. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return fail("unauthorized", 401);
  const { id } = await ctx.params;
  const db = await getDb();
  const found = db.payIntents.find((x) => x.id === id && x.userId === user.id);
  if (!found) return fail("not_found", 404);
  // timeouts are decided when someone looks, and kept
  const view = await mutate((d) => {
    const i = d.payIntents.find((x) => x.id === id);
    if (!i) return null;
    refreshIntent(i);
    return intentView(d, i);
  });
  return view ? ok({ view }) : fail("not_found", 404);
}
