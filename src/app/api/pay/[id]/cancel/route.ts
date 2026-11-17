import { payStep } from "@/lib/server/payRoute";

/** The customer backs out of this attempt. Their orders stay reserved until the lock runs out, and they can pay another way. */
export const POST = (req: Request, ctx: { params: Promise<{ id: string }> }) =>
  payStep(req, ctx, (_db, i) => {
    if (i.status !== "created" && i.status !== "awaiting") return { error: "intent_closed" };
    i.status = "cancelled";
    i.attempts.push({ at: new Date().toISOString(), result: "cancelled" });
    i.updatedAt = new Date().toISOString();
    return {};
  });
