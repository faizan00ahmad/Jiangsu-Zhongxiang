// Foundation: database upgrade, files under "admin pannel", sign-in, every admin screen opens.
import fs from "node:fs";
import path from "node:path";
import { ADMINS, ROOT, client, readDb, suite } from "./lib.mjs";

const s = suite("foundation");
const c = client();

s.check("public home page loads", (await c.get("/")).status === 200);
const db = readDb();
s.check("database file lives in admin pannel/data", fs.existsSync(path.join(ROOT, "admin pannel", "data", "db.json")));
s.check("database is version 3", db.version === 3, db.version);
for (const k of ["roles", "banners", "pages", "navItems", "posts", "brands", "categories", "coupons", "currencies", "zones", "reviews", "enquiries", "chats", "templates", "outbox", "audit", "integrations"]) s.check(`collection ${k} exists`, db[k] !== undefined);
s.check("3 built-in roles", ["super", "operator", "dealer"].every((r) => db.roles.some((x) => x.id === r)));
s.check("orders and users survived the upgrade", db.orders.length > 0 && db.users.length > 0);
const backups = fs.existsSync(path.join(ROOT, "admin pannel", "backups")) ? fs.readdirSync(path.join(ROOT, "admin pannel", "backups")) : [];
s.check("a backup was written before/after migration", backups.length > 0, backups.join(","));

const login = await c.loginAdmin(...ADMINS.super);
s.check("super admin signs in", login.ok, JSON.stringify(login));
const pages = ["", "/models", "/categories", "/brands", "/options", "/inventory", "/quotes", "/orders", "/coupons", "/logistics", "/zones", "/users", "/reviews", "/enquiries", "/chat", "/banners", "/pages", "/nav", "/posts", "/templates", "/outbox", "/integrations", "/currencies", "/seo", "/health", "/cache", "/admins", "/roles", "/audit", "/backups", "/settings", "/profile"];
for (const p of pages) {
  const r = await c.get(`/admin${p}`);
  s.check(`/admin${p} opens`, r.status === 200, r.status);
}
const out = s.done();
process.exit(out.failed ? 1 : 0);
