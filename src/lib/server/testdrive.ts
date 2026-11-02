import type { DB, Dealer, TestDrive } from "../types";

/** Test drive slot rules. Dates are Pakistan calendar days (UTC+5); a slot is "HH:MM" in the store's local time. */

export const MAX_DAYS_AHEAD = 30;
const PK = 5 * 3600000;
export const todayPk = (now = Date.now()) => new Date(now + PK).toISOString().slice(0, 10);
export const addDaysIso = (iso: string, n: number) => new Date(new Date(`${iso}T00:00:00Z`).getTime() + n * 86400000).toISOString().slice(0, 10);
const weekday = (iso: string) => new Date(`${iso}T00:00:00Z`).getUTCDay();
const mins = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const hhmm = (n: number) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
export const isDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
export const isTime = (s: unknown): s is string => typeof s === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

/** Bookings that still hold a place. */
export const holding = (t: TestDrive) => t.status === "requested" || t.status === "confirmed" || t.status === "completed";

export function offersModel(d: Dealer, model: string) {
  const r = d.testDrive;
  return !!r && r.enabled && d.enabled && (r.models.length === 0 || r.models.includes(model));
}

/** Free and taken places for one store, model and day. Empty when the store is closed that day or the date is out of range. */
export function slotsFor(db: DB, d: Dealer, model: string, date: string, now = Date.now()): { time: string; left: number }[] {
  const r = d.testDrive;
  if (!r || !offersModel(d, model) || !isDate(date)) return [];
  const first = addDaysIso(todayPk(now), 1);
  const last = addDaysIso(todayPk(now), MAX_DAYS_AHEAD);
  if (date < first || date > last || !r.days.includes(weekday(date))) return [];
  const out: { time: string; left: number }[] = [];
  const step = Math.max(15, r.slotMinutes);
  for (let t = mins(r.from); t + step <= mins(r.to); t += step) {
    const time = hhmm(t);
    const taken = db.testDrives.filter((b) => b.dealerId === d.id && b.date === date && b.time === time && holding(b)).length;
    out.push({ time, left: Math.max(0, r.capacity - taken) });
  }
  return out;
}

/** "Mon 3 Nov, 10:00" for messages. */
export const whenText = (date: string, time: string) => `${new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })}, ${time}`;
