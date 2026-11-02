// Every demo login signs in and sees exactly what its role allows.
import { client, readDb, suite } from "./lib.mjs";

const s = suite("demo logins");
const ADMINS = [
  ["admin", "Admin@2026", { yes: ["/admin/roles", "/admin/backups", "/admin/integrations", "/admin/audit", "/admin/orders"], no: [] }],
  ["operator", "Operator@2026", { yes: ["/admin/orders", "/admin/models", "/admin/banners", "/admin/users"], no: ["/admin/roles", "/admin/backups", "/admin/integrations", "/admin/settings"] }],
  ["content.editor", "Content@2026", { yes: ["/admin/banners", "/admin/pages", "/admin/posts", "/admin/seo", "/admin/nav"], no: ["/admin/orders", "/admin/users", "/admin/roles", "/admin/integrations"] }],
  ["support.agent", "Support@2026", { yes: ["/admin/enquiries", "/admin/reviews", "/admin/orders", "/admin/users"], no: ["/admin/banners", "/admin/roles", "/admin/models", "/admin/settings"] }],
  ["dealer.lahore", "Dealer@2026", { yes: ["/admin/orders", "/admin/inventory"], no: ["/admin/users", "/admin/banners", "/admin/roles", "/admin/integrations"] }],
  ["dealer.karachi", "Dealer@2026", { yes: ["/admin/orders", "/admin/inventory"], no: ["/admin/users", "/admin/banners", "/admin/roles", "/admin/integrations"] }],
];
// a page the role may not open redirects to the dashboard (307) instead of rendering (200)
for (const [user, pw, rules] of ADMINS) {
  const c = client();
  const r = await c.loginAdmin(user, pw);
  s.check(`${user} signs in`, r.ok, JSON.stringify(r));
  const home = await c.get("/admin");
  s.check(`${user} opens the dashboard`, home.status === 200, home.status);
  for (const p of rules.yes) {
    const x = await c.get(p);
    s.check(`${user} can open ${p}`, x.status === 200, x.status);
  }
  for (const p of rules.no) {
    const x = await c.get(p);
    s.check(`${user} is kept out of ${p}`, x.status !== 200, x.status);
  }
  const bad = await client().loginAdmin(user, "wrong-password-1");
  s.check(`${user} wrong password refused`, !bad.ok && bad.status === 401, bad.status);
}
// dealer stores only see their own orders
const db = readDb();
for (const [user, dealerId] of [["dealer.lahore", "dl-lhr-1"], ["dealer.karachi", "dl-khi-1"]]) {
  const c = client();
  await c.loginAdmin(user, "Dealer@2026");
  const mine = db.orders.filter((o) => o.contact.dealerId === dealerId);
  const other = db.orders.find((o) => o.contact.dealerId && o.contact.dealerId !== dealerId);
  if (other) s.check(`${user} cannot open another store's order`, (await c.get(`/admin/orders/${other.id}`)).status !== 200);
  if (mine[0]) s.check(`${user} can open its own order`, (await c.get(`/admin/orders/${mine[0].id}`)).status === 200);
}
for (const [phone, pw] of [["03001234567", "Demo@2026"], ["03111234567", "Demo@2026"], ["03211234567", "Demo@2026"]]) {
  const c = client();
  const r = await c.loginUser(phone, pw);
  s.check(`customer ${phone} signs in`, r.ok, JSON.stringify(r));
  s.check(`customer ${phone} opens My account`, (await c.get("/account")).status === 200);
  s.check(`customer ${phone} is blocked from the admin`, (await c.get("/admin")).status !== 200);
}
s.check("login pages show the demo buttons", (await client().get("/admin/login")).text.includes("dealer.karachi") && (await client().get("/login")).text.includes("Sara Khan"));
const out = s.done();
process.exit(out.failed ? 1 : 0);
