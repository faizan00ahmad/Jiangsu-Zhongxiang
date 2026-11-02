import { audit, guard } from "@/lib/server/admin";
import { mutate } from "@/lib/server/db";
import { fail, int, ok, readJson, str } from "@/lib/server/http";
import { notify } from "@/lib/server/notify";
import { isDate, isTime, slotsFor, whenText } from "@/lib/server/testdrive";
import type { TestDriveStatus } from "@/lib/types";

const FLOW: Record<TestDriveStatus, TestDriveStatus[]> = {
  requested: ["confirmed", "cancelled"],
  confirmed: ["completed", "no_show", "cancelled"],
  completed: [],
  cancelled: [],
  no_show: [],
};

/** Staff action on one booking: confirm, complete, mark missed, cancel, reschedule, add a note. Dealer roles only touch their own store. */
export async function PATCH(req: Request) {
  const g = await guard("testdrives.edit");
  if (g.res) return g.res;
  const b = await readJson(req);
  if (!b) return fail("invalid_input");
  const { admin } = g;
  const res = await mutate((db) => {
    const t = db.testDrives.find((x) => x.id === b.id);
    if (!t || (admin.scope === "dealer" && t.dealerId !== admin.dealerId)) return "not_found";
    const d = db.dealers.find((x) => x.id === t.dealerId);
    const m = db.models.find((x) => x.slug === t.model);
    const now = new Date().toISOString();
    const user = db.users.find((u) => u.id === t.userId);
    const vars = () => ({ model: m?.name ?? t.model, store: d?.name.en ?? "", when: whenText(t.date, t.time), ref: t.id });
    if (typeof b.adminNote === "string") t.adminNote = str(b.adminNote, 400);
    if (b.date !== undefined || b.time !== undefined) {
      if (t.status === "completed" || t.status === "cancelled" || t.status === "no_show") return "invalid_stage";
      const date = b.date ?? t.date;
      const time = b.time ?? t.time;
      if (!isDate(date) || !isTime(time)) return "invalid_input";
      if (date !== t.date || time !== t.time) {
        const slot = d ? slotsFor(db, d, t.model, date).find((s) => s.time === time) : undefined;
        if (!slot) return "slot_invalid";
        if (slot.left <= 0) return "slot_full";
        t.date = date;
        t.time = time;
        t.history.push({ at: now, by: admin.username, action: `rescheduled ${date} ${time}` });
        notify(db, "testdrive.confirmed", { name: t.name, phone: t.phone, email: user?.email }, vars(), t.id);
      }
    }
    if (typeof b.status === "string" && b.status !== t.status) {
      const next = b.status as TestDriveStatus;
      if (!FLOW[t.status].includes(next)) return "invalid_stage";
      t.status = next;
      t.history.push({ at: now, by: admin.username, action: next });
      if (next === "confirmed") notify(db, "testdrive.confirmed", { name: t.name, phone: t.phone, email: user?.email }, vars(), t.id);
      if (next === "cancelled") notify(db, "testdrive.cancelled", { name: t.name, phone: t.phone, email: user?.email }, vars(), t.id);
    }
    audit(db, admin, "update", "testdrives", t.id, `${t.status} · ${t.date} ${t.time}`);
    return "ok";
  });
  return res === "ok" ? ok() : fail(res, res === "not_found" ? 404 : res === "invalid_input" ? 400 : 409);
}

/** PUT {dealerId, rules}: opening days, hours, slot length, capacity and models for one store's test drives. */
export async function PUT(req: Request) {
  const g = await guard("testdrives.edit");
  if (g.res) return g.res;
  const b = await readJson(req);
  const r = b?.rules as Record<string, unknown> | undefined;
  if (!b || !r) return fail("invalid_input");
  const { admin } = g;
  const res = await mutate((db) => {
    const d = db.dealers.find((x) => x.id === b.dealerId);
    if (!d || (admin.scope === "dealer" && d.id !== admin.dealerId)) return "not_found";
    const from = r.from;
    const to = r.to;
    const slot = int(r.slotMinutes, 15, 240);
    const cap = int(r.capacity, 1, 20);
    if (!isTime(from) || !isTime(to) || from >= to || slot === null || cap === null) return "invalid_input";
    const days = [...new Set((Array.isArray(r.days) ? r.days : []).map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6))].sort();
    const models = [...new Set((Array.isArray(r.models) ? r.models : []).filter((s): s is string => typeof s === "string" && db.models.some((m) => m.slug === s)))];
    d.testDrive = { enabled: r.enabled === true, models, days, from, to, slotMinutes: slot, capacity: cap };
    audit(db, admin, "update", "testdrives", d.id, `rules ${d.name.en}`);
    return "ok";
  });
  return res === "ok" ? ok() : fail(res, res === "not_found" ? 404 : 400);
}
