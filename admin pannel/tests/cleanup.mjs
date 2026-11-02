// Removes the records the test suites create (QA users, their orders/quotes/test drives, QA partners, enquiries, roles, admins).
// Run with the server STOPPED, otherwise the running server saves its own copy over this one.
import fs from "node:fs";
import { DB_PATH } from "./lib.mjs";

const db = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
const before = { users: db.users.length, orders: db.orders.length, quotes: db.quotes.length, testDrives: db.testDrives.length, partners: db.partners.length, enquiries: db.enquiries.length, outbox: db.outbox.length, audit: db.audit.length };

const qaUsers = new Set(db.users.filter((u) => /^(QA |Other$)/.test(u.name)).map((u) => u.id));
const qaPhones = new Set(db.users.filter((u) => qaUsers.has(u.id)).map((u) => u.phone));
const dropOrders = db.orders.filter((o) => qaUsers.has(o.userId) || o.contact?.name === "Smoke Test");
for (const o of dropOrders) if (o.status !== "cancelled" && o.status !== "expired") db.factoryStock[o.model] = (db.factoryStock[o.model] ?? 0) + 1;
const dropIds = new Set(dropOrders.map((o) => o.id));
db.orders = db.orders.filter((o) => !dropIds.has(o.id));
db.quotes = db.quotes.filter((q) => !qaUsers.has(q.userId) && !dropOrders.some((o) => o.quoteId === q.id));
db.testDrives = db.testDrives.filter((t) => !qaUsers.has(t.userId));
db.users = db.users.filter((u) => !qaUsers.has(u.id));
db.partners = db.partners.filter((p) => !/^(QA Partner|Spam \d)$/.test(p.name));
db.enquiries = db.enquiries.filter((e) => e.name !== "QA Enq");
db.admins = db.admins.filter((a) => !/^qa\./.test(a.username));
db.roles = db.roles.filter((r) => !/^QA Role/.test(r.name.en));
db.outbox = db.outbox.filter((m) => !dropIds.has(m.ref ?? "") && !qaPhones.has(m.to) && !/^(TD-|PA-|EN-|test)/.test(m.ref ?? "") && !/@example\.com$/.test(m.to));
db.audit = db.audit.filter((a) => !/qa[-.]|QA /i.test(a.summary) && !/^(qa-|qa\.)/i.test(a.entityId));
fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 1));
const after = { users: db.users.length, orders: db.orders.length, quotes: db.quotes.length, testDrives: db.testDrives.length, partners: db.partners.length, enquiries: db.enquiries.length, outbox: db.outbox.length, audit: db.audit.length };
console.log({ before, after });
