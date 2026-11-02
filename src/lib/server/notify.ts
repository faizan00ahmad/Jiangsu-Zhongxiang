import { promises as fs } from "node:fs";
import path from "node:path";
import type { Channel, DB, OutboxItem } from "../types";
import { randomId } from "./crypto";
import { OUTBOX_DIR } from "./paths";

/** Event → template → channel. Real email/SMS/WhatsApp providers plug in where `deliver` is; until the client's
 *  accounts are connected every message is written to the outbox as "sandbox" so the whole flow can be tested. */

export type Recipient = { name?: string; email?: string | null; phone?: string | null };

const fill = (s: string, vars: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");

function deliver(db: DB, channel: Channel): OutboxItem["status"] {
  // sandbox until a provider is connected: the Integrations page says so
  const live = (channel === "email" && db.integrations.smtp.enabled) || (channel === "sms" && db.integrations.sms.enabled);
  return live ? "sent" : "sandbox";
}

/** Queues every enabled template for `event`. Call inside `mutate` so the outbox is saved with the change that caused it. */
export function notify(db: DB, event: string, to: Recipient, vars: Record<string, string>, ref: string | null = null, lang: "en" | "ur" = "en"): OutboxItem[] {
  const made: OutboxItem[] = [];
  const all = { name: to.name ?? "", ...vars };
  for (const t of db.templates) {
    if (!t.enabled || t.event !== event) continue;
    const addr = t.channel === "email" ? to.email : to.phone;
    if (!addr) continue;
    const item: OutboxItem = { id: randomId(6), channel: t.channel, to: addr, subject: fill(t.subject[lang] || t.subject.en, all), body: fill(t.body[lang] || t.body.en, all), event, ref, status: deliver(db, t.channel), at: new Date().toISOString() };
    db.outbox.push(item);
    made.push(item);
  }
  if (db.outbox.length > 3000) db.outbox.splice(0, db.outbox.length - 3000);
  mirror(made);
  return made;
}

/** Plain-text copy of each message under outbox/ so the sandbox sends can be read without the admin panel. */
function mirror(items: OutboxItem[]) {
  if (!items.length) return;
  const dir = OUTBOX_DIR;
  const file = path.join(dir, `${new Date().toISOString().slice(0, 10)}.jsonl`);
  fs.mkdir(dir, { recursive: true })
    .then(() => fs.appendFile(file, items.map((i) => JSON.stringify(i)).join("\n") + "\n", "utf8"))
    .catch(() => undefined);
}
