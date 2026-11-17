// Removes the records the test suites create (QA users, their orders/quotes/test drives, QA partners, enquiries, roles, admins).
// Run with the server STOPPED, otherwise the running server saves its own copy over this one.
import fs from "node:fs";
import path from "node:path";
import { DB_PATH } from "./lib.mjs";

const db = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
const before = { payIntents: (db.payIntents ?? []).length, users: db.users.length, orders: db.orders.length, quotes: db.quotes.length, testDrives: db.testDrives.length, partners: db.partners.length, enquiries: db.enquiries.length, outbox: db.outbox.length, audit: db.audit.length };

const qaUsers = new Set(db.users.filter((u) => /^(QA |Other$)/.test(u.name)).map((u) => u.id));
const qaPhones = new Set(db.users.filter((u) => qaUsers.has(u.id)).map((u) => u.phone));
const dropOrders = db.orders.filter((o) => qaUsers.has(o.userId) || o.contact?.name === "Smoke Test");
for (const o of dropOrders) if (o.status !== "cancelled" && o.status !== "expired") db.factoryStock[o.model] = (db.factoryStock[o.model] ?? 0) + 1;
const dropIds = new Set(dropOrders.map((o) => o.id));
db.orders = db.orders.filter((o) => !dropIds.has(o.id));
// payment attempts of the QA customers, and the bank receipts they uploaded
const dropIntents = (db.payIntents ?? []).filter((i) => qaUsers.has(i.userId));
for (const i of dropIntents) {
  if (i.receipt) fs.rmSync(path.join(path.dirname(DB_PATH), "uploads", "receipts", i.receipt), { force: true });
}
db.payIntents = (db.payIntents ?? []).filter((i) => !qaUsers.has(i.userId));
db.quotes = db.quotes.filter((q) => !qaUsers.has(q.userId) && !dropOrders.some((o) => o.quoteId === q.id));
db.testDrives = db.testDrives.filter((t) => !qaUsers.has(t.userId));
db.users = db.users.filter((u) => !qaUsers.has(u.id));
db.partners = db.partners.filter((p) => !/^(QA Partner|Spam \d)$/.test(p.name));
db.enquiries = db.enquiries.filter((e) => e.name !== "QA Enq");
db.admins = db.admins.filter((a) => !/^qa\./.test(a.username));
db.roles = db.roles.filter((r) => !/^QA Role/.test(r.name.en));
const dropRefs = new Set(dropIntents.map((i) => i.id));
db.outbox = db.outbox.filter((m) => !dropIds.has(m.ref ?? "") && !dropRefs.has(m.ref ?? "") && !qaPhones.has(m.to) && !/^(TD-|PA-|EN-|test)/.test(m.ref ?? "") && !/@example\.com$/.test(m.to));
db.audit = db.audit.filter((a) => !/qa[-.]|QA /i.test(a.summary) && !/^(qa-|qa\.)/i.test(a.entityId));
fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 1));
const after = { payIntents: db.payIntents.length, users: db.users.length, orders: db.orders.length, quotes: db.quotes.length, testDrives: db.testDrives.length, partners: db.partners.length, enquiries: db.enquiries.length, outbox: db.outbox.length, audit: db.audit.length };
console.log({ before, after });
