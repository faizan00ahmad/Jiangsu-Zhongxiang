import { payStep } from "@/lib/server/payRoute";
import { submitOtp } from "@/lib/server/payments";

/** POST {code}: the wallet PIN / OTP or the card's 3-D Secure code. Success moves every order of the checkout into the factory queue. */
export const POST = (req: Request, ctx: { params: Promise<{ id: string }> }) => payStep(req, ctx, (db, i, b) => submitOtp(db, i, b.code), 20);
