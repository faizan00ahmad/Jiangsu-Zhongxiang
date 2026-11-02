import { isCity } from "@/lib/catalog";
import { randomId } from "@/lib/server/crypto";
import { mutate } from "@/lib/server/db";
import { clientIp, fail, normalizePhone, ok, readJson, str, throttled } from "@/lib/server/http";
import { notify } from "@/lib/server/notify";
import type { EnquiryForm } from "@/lib/types";

const FORMS: EnquiryForm[] = ["sales", "dealership", "support", "export"];

/** Public enquiry form. Several types, each lands in the admin Enquiries list; the sender gets an acknowledgement. */
export async function POST(req: Request) {
  const b = await readJson(req);
  if (!b) return fail("invalid_input");
  if (throttled(`enq:${clientIp(req)}`, 6, 60 * 60 * 1000)) return fail("too_many_attempts", 429);
  const form = FORMS.find((x) => x === b.form);
  const name = str(b.name, 80);
  const phone = normalizePhone(b.phone);
  const email = str(b.email, 120);
  const message = str(b.message, 1500);
  if (!form || !name || !message) return fail("required");
  if (!phone) return fail("invalid_phone");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("invalid_email");
  const id = `EN-${randomId(5).toUpperCase().replace(/[^A-Z0-9]/g, "X")}`;
  await mutate((db) => {
    const model = db.models.find((m) => m.slug === b.model)?.name ?? null;
    db.enquiries.push({ id, form, name, phone, email, city: isCity(b.city) ? b.city : "", model, message, status: "new", assignee: null, replies: [], createdAt: new Date().toISOString() });
    notify(db, "enquiry.received", { name, email: email || null, phone }, { ref: id }, id);
  });
  return ok({ id });
}