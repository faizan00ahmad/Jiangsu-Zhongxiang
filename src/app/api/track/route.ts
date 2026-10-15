import { getDb } from "@/lib/server/db";
import { clientIp, fail, normalizePhone, ok, readJson, str, throttled } from "@/lib/server/http";
import { trackingView } from "@/lib/server/views";

/** Public tracking lookup: order number + the mobile number on the order (sent in the body, never the URL). */
export async function POST(req: Request) {
  const b = await readJson(req);
  if (!b) return fail("invalid_input");
  if (throttled(`track:${clientIp(req)}`, 30)) return fail("too_many_attempts", 429);
  const no = str(b.orderNo, 30).toUpperCase().replace(/\s/g, "");
  const phone = normalizePhone(b.phone);
  if (!no) return fail("invalid_input");
  if (!phone) return fail("invalid_phone");
  const db = await getDb();
  const o = db.orders.find((x) => x.id === no && x.contact.phone === phone);
  if (!o) return fail("not_found", 404);
  return ok({ order: trackingView(db, o) });
}
