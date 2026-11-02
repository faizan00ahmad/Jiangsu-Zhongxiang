import { randomId } from "@/lib/server/crypto";
import { mutate } from "@/lib/server/db";
import { clientIp, fail, ok, readJson, str, throttled } from "@/lib/server/http";
import { notify } from "@/lib/server/notify";
import { currentUser } from "@/lib/server/session";
import { holding, isDate, isTime, slotsFor, whenText } from "@/lib/server/testdrive";

/** A signed-in customer requests a test drive. The store confirms it later from the admin. */
export async function POST(req: Request) {
  const b = await readJson(req);
  if (!b) return fail("invalid_input");
  const user = await currentUser();
  if (!user) return fail("unauthorized", 401);
  if (throttled(`td:${clientIp(req)}:${user.id}`, 12)) return fail("too_many_attempts", 429);
  const model = str(b.model, 60);
  const dealerId = str(b.dealerId, 40);
  const { date, time } = b as { date?: unknown; time?: unknown };
  if (!model || !dealerId || !isDate(date) || !isTime(time)) return fail("invalid_input");
  const note = str(b.note, 300);
  const res = await mutate((db) => {
    const m = db.models.find((x) => x.slug === model && x.enabled);
    const d = db.dealers.find((x) => x.id === dealerId);
    if (!m || !d) return { error: "bad_store" };
    const slot = slotsFor(db, d, model, date).find((s) => s.time === time);
    if (!slot) return { error: "slot_invalid" };
    if (slot.left <= 0) return { error: "slot_full" };
    if (db.testDrives.some((t) => t.userId === user.id && t.date === date && t.time === time && holding(t))) return { error: "already_booked" };
    const now = new Date().toISOString();
    const t = { id: `TD-${randomId(5).toUpperCase().replace(/[^A-Z0-9]/g, "X")}`, userId: user.id, name: user.name, phone: user.phone, model, dealerId, date, time, status: "requested" as const, note, adminNote: "", createdAt: now, history: [{ at: now, by: "customer", action: "requested" }] };
    db.testDrives.push(t);
    notify(db, "testdrive.requested", { name: user.name, phone: user.phone, email: user.email }, { model: m.name, store: d.name.en, when: whenText(date, time), ref: t.id }, t.id);
    return { id: t.id };
  });
  if (!res.id) return fail(res.error ?? "invalid_input", res.error === "slot_full" || res.error === "already_booked" ? 409 : 400);
  return ok({ id: res.id });
}
