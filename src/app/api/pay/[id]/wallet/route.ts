import { payStep } from "@/lib/server/payRoute";
import { submitWallet } from "@/lib/server/payments";

/** POST {number}: the wallet number. The gateway asks the customer to approve on their phone. */
export const POST = (req: Request, ctx: { params: Promise<{ id: string }> }) => payStep(req, ctx, (_db, i, b) => submitWallet(i, b.number), 12);
