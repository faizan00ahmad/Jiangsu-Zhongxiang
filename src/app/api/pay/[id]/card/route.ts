import { payStep } from "@/lib/server/payRoute";
import { submitCard } from "@/lib/server/payments";

/** POST {number, expiry, cvv, name}: the card form. The number and CVV live only for this request. */
export const POST = (req: Request, ctx: { params: Promise<{ id: string }> }) => payStep(req, ctx, (_db, i, b) => submitCard(i, b), 12);
