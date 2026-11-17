import { mutate } from "./db";
import { clientIp, fail, ok, readJson, sameOrigin, throttled } from "./http";
import { currentUser } from "./session";
import { intentView, refreshIntent } from "./payments";
import type { DB, PayIntent } from "../types";

type Ctx = { params: Promise<{ id: string }> };
type Outcome = { error?: string; view?: ReturnType<typeof intentView> };

/** Shared shell of every customer payment step: same-origin, signed in, the attempt is theirs, rate-limited, timeouts decided. */
export async function payStep(req: Request, ctx: Ctx, run: (db: DB, intent: PayIntent, body: Record<string, unknown>) => { error?: string }, limit = 30) {
  if (!sameOrigin(req)) return fail("invalid_input", 403);
  const user = await currentUser();
  if (!user) return fail("unauthorized", 401);
  if (throttled(`paystep:${user.id}`, limit, 10 * 60 * 1000) || throttled(`paystepip:${clientIp(req)}`, limit * 3, 10 * 60 * 1000)) return fail("too_many_attempts", 429);
  const { id } = await ctx.params;
  const body = (await readJson(req)) ?? {};
  const out = await mutate((db): Outcome => {
    const intent = db.payIntents.find((x) => x.id === id && x.userId === user.id);
    if (!intent) return { error: "not_found" };
    refreshIntent(intent);
    const r = run(db, intent, body);
    // the screen always gets the new state, also when this step was refused, so it can show what happened
    return { error: r.error, view: intentView(db, intent) };
  });
  if (out.error) return Response.json({ ok: false, error: out.error, view: out.view ?? null }, { status: out.error === "not_found" ? 404 : 409 });
  return ok({ view: out.view });
}
