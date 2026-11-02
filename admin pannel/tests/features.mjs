// The six requested features, plus the admin framework (content, backups, roles, export) checked end to end.
import fs from "node:fs";
import path from "node:path";
import { ADMINS, BASE, ROOT, client, readDb, suite } from "./lib.mjs";

const s = suite("features");
const adminC = client();
await adminC.loginAdmin(...ADMINS.super);
const opC = client();
await opC.loginAdmin(...ADMINS.operator);
const lhr = client();
await lhr.loginAdmin("dealer.lahore", "Dealer@2026");
const khi = client();
await khi.loginAdmin("dealer.karachi", "Dealer@2026");
const RUN = Math.random().toString(36).slice(2, 7);
const outboxHas = (event, ref) => readDb().outbox.some((o) => o.event === event && (!ref || o.ref === ref));
const fresh = async (tag) => {
  const c = client();
  const phone = `03${String(Math.floor(100000000 + Math.random() * 899999999)).slice(0, 9)}`;
  const r = await c.post("/api/auth/register", { name: `QA ${tag}`, phone, password: "QaTest@2026", city: "lahore" });
  s.check(`register ${tag}`, r.ok, JSON.stringify(r));
  return { c, phone };
};
const quote = async (c, model, config = {}) => (await c.post("/api/quotes", { model, config })).id;
const dbQuote = (id) => readDb().quotes.find((q) => q.id === id);

/* ── 6. solar panel ── */
{
  const { c } = await fresh("solar");
  const base = await quote(c, "crown-ii", { solar: "none" });
  const s200 = await quote(c, "crown-ii", { solar: "s200" });
  const a = dbQuote(base), b = dbQuote(s200);
  s.check("solar tier adds its price (PKR 45,000)", b.total - a.total === 45000, `${a.total} → ${b.total}`);
  s.check("solar line appears in the quote", b.lines.some((l) => l.group === "solar" && l.price === 45000));
  s.check("solar adds +15 km range", b.range - a.range === 15, `${a.range} → ${b.range}`);
  const m = readDb().models.find((x) => x.slug === "crown-ii");
  const hide = await adminC.put("/api/admin/models", { slug: "crown-ii", patch: { hideOptions: ["solar"] } });
  s.check("admin can hide solar on a model", hide.ok);
  const h = dbQuote(await quote(c, "crown-ii", { solar: "s300" }));
  s.check("hidden solar is ignored on that model", !h.lines.some((l) => l.group === "solar"), JSON.stringify(h.lines.map((l) => l.group)));
  await adminC.put("/api/admin/models", { slug: "crown-ii", patch: { hideOptions: m.hideOptions ?? [] } });
  const page = await c.get("/customize/crown-ii");
  s.check("configurator page lists the solar group", /Solar Panel/.test(page.text));
  const opt = await adminC.put("/api/admin/options", { groups: [{ key: "solar", items: [{ id: "s100", price: 26000, rangeKm: 9 }] }] });
  s.check("admin edits a solar tier", opt.ok);
  const s100 = dbQuote(await quote(c, "crown-ii", { solar: "s100" }));
  s.check("edited tier price and range apply", s100.lines.find((l) => l.group === "solar")?.price === 26000 && s100.range - a.range === 9);
  await adminC.put("/api/admin/options", { groups: [{ key: "solar", items: [{ id: "s100", price: 25000, rangeKm: 8 }] }] });
}

/* ── 1. pickup store chosen after ordering ── */
let orderId;
{
  const { c, phone } = await fresh("pickup");
  const q = await quote(c, "phoenix");
  const bad = await c.post("/api/orders", { quoteId: q, contact: { name: "QA Pickup", phone } });
  s.check("order needs a city", !bad.ok && bad.error === "city_required", JSON.stringify(bad));
  const o = await c.post("/api/orders", { quoteId: q, contact: { name: "QA Pickup", phone, city: "lahore" } });
  s.check("order placed without choosing a store", o.ok, JSON.stringify(o));
  orderId = o.id;
  const rec = () => readDb().orders.find((x) => x.id === orderId);
  s.check("order has no store yet", rec().contact.dealerId === null);
  const pg = await c.get(`/orders/${orderId}`);
  s.check("order page asks for a pickup store", pg.status === 200 && /Your pickup store/.test(pg.text));
  s.check("dealer sees nothing before a store is chosen", !(await lhr.get(`/admin/orders`)).text.includes(orderId));
  s.check("invalid store refused", (await c.post(`/api/orders/${orderId}/pickup`, { dealerId: "nope" })).error === "bad_store");
  const other = client();
  await other.post("/api/auth/register", { name: "Other", phone: `03${String(Math.floor(100000000 + Math.random() * 899999999)).slice(0, 9)}`, password: "QaTest@2026", city: "lahore" });
  s.check("another customer cannot set the store", (await other.post(`/api/orders/${orderId}/pickup`, { dealerId: "dl-lhr-1" })).status === 404);
  const pick = await c.post(`/api/orders/${orderId}/pickup`, { dealerId: "dl-lhr-1" });
  s.check("customer chooses a store", pick.ok, JSON.stringify(pick));
  s.check("store saved on the order", rec().contact.dealerId === "dl-lhr-1");
  s.check("customer is notified", outboxHas("pickup.chosen", orderId));
  s.check("the Lahore dealer now sees the order", (await lhr.get(`/admin/orders/${orderId}`)).status === 200);
  s.check("the Karachi dealer still cannot", (await khi.get(`/admin/orders/${orderId}`)).status !== 200);
  s.check("customer can change the store", (await c.post(`/api/orders/${orderId}/pickup`, { dealerId: "dl-khi-1" })).ok && rec().contact.dealerId === "dl-khi-1");
  const asg = await opC.patch(`/api/admin/orders/${orderId}`, { action: "pickup", dealerId: "dl-lhr-2" });
  s.check("operator can assign a store", asg.ok && rec().contact.dealerId === "dl-lhr-2", JSON.stringify(asg));
  s.check("dealer role cannot assign stores", !(await lhr.patch(`/api/admin/orders/${orderId}`, { action: "pickup", dealerId: "dl-lhr-1" })).ok);
  // pay, verify, move to the last leg: the choice locks
  await c.post(`/api/orders/${orderId}/pay`, { method: "bank" });
  await adminC.patch(`/api/admin/orders/${orderId}`, { action: "verify" });
  await adminC.patch(`/api/admin/orders/${orderId}`, { action: "stage", stage: 6 });
  const late = await c.post(`/api/orders/${orderId}/pickup`, { dealerId: "dl-lhr-1" });
  s.check("store locks once the vehicle is on its last leg", !late.ok && late.error === "store_locked", JSON.stringify(late));
  s.check("order page shows the locked notice", /can't be changed here/.test((await c.get(`/orders/${orderId}`)).text));
  s.check("stage change notified the customer", outboxHas("stage.changed", orderId));
}

/* ── 2. test drive booking ── */
{
  const nextDay = (dow, from = 1) => {
    const d = new Date(Date.now() + 5 * 3600000);
    d.setUTCDate(d.getUTCDate() + from);
    while (d.getUTCDay() !== dow) d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  };
  const dow = 1 + Math.floor(Math.random() * 6);
  const mon = nextDay(dow, 2 + Math.floor(Math.random() * 20));
  const sun = nextDay(0, 2);
  const a = await fresh("td-a"), b = await fresh("td-b"), d3 = await fresh("td-c");
  const slots = await a.c.get(`/api/test-drive/slots?dealer=dl-lhr-1&model=crown-ii&date=${mon}`);
  const sl = JSON.parse(slots.text).slots;
  s.check("open day has slots", sl.length >= 5, slots.text.slice(0, 120));
  s.check("closed day (Sunday) has none", JSON.parse((await a.c.get(`/api/test-drive/slots?dealer=dl-lhr-1&model=crown-ii&date=${sun}`)).text).slots.length === 0);
  const past = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  s.check("past date has none", JSON.parse((await a.c.get(`/api/test-drive/slots?dealer=dl-lhr-1&model=crown-ii&date=${past}`)).text).slots.length === 0);
  const far = new Date(Date.now() + 40 * 86400000).toISOString().slice(0, 10);
  s.check("date beyond 30 days has none", JSON.parse((await a.c.get(`/api/test-drive/slots?dealer=dl-lhr-1&model=crown-ii&date=${far}`)).text).slots.length === 0);
  const time = sl[Math.floor(Math.random() * sl.length)].time;
  s.check("guests cannot book", (await client().post("/api/test-drive", { model: "crown-ii", dealerId: "dl-lhr-1", date: mon, time })).status === 401);
  const r1 = await a.c.post("/api/test-drive", { model: "crown-ii", dealerId: "dl-lhr-1", date: mon, time, note: "QA" });
  s.check("customer requests a test drive", r1.ok, JSON.stringify(r1));
  s.check("same customer cannot double-book a time", (await a.c.post("/api/test-drive", { model: "phoenix", dealerId: "dl-lhr-1", date: mon, time })).error === "already_booked");
  s.check("second customer takes the last place", (await b.c.post("/api/test-drive", { model: "crown-ii", dealerId: "dl-lhr-1", date: mon, time })).ok);
  const full = await d3.c.post("/api/test-drive", { model: "crown-ii", dealerId: "dl-lhr-1", date: mon, time });
  s.check("full slot refused (capacity 2)", !full.ok && full.error === "slot_full", JSON.stringify(full));
  s.check("slot shows as full", JSON.parse((await a.c.get(`/api/test-drive/slots?dealer=dl-lhr-1&model=crown-ii&date=${mon}`)).text).slots.find((x) => x.time === time).left === 0);
  s.check("invalid time refused", (await d3.c.post("/api/test-drive", { model: "crown-ii", dealerId: "dl-lhr-1", date: mon, time: "03:00" })).error === "slot_invalid");
  s.check("request e-mail queued", outboxHas("testdrive.requested", r1.id));
  s.check("page lists my booking", (await a.c.get("/test-drive")).text.includes("Waiting for confirmation"));
  s.check("Karachi dealer cannot touch a Lahore booking", (await khi.patch("/api/admin/testdrives", { id: r1.id, status: "confirmed" })).status === 404);
  const conf = await lhr.patch("/api/admin/testdrives", { id: r1.id, status: "confirmed" });
  s.check("Lahore dealer confirms", conf.ok, JSON.stringify(conf));
  s.check("confirmation message queued", outboxHas("testdrive.confirmed", r1.id));
  s.check("cannot jump back to requested", !(await lhr.patch("/api/admin/testdrives", { id: r1.id, status: "requested" })).ok);
  const bId = readDb().testDrives.find((x) => x.date === mon && x.time === time && x.name === "QA td-b")?.id;
  const canc = await a.c.post(`/api/test-drive/${r1.id}/cancel`, {});
  s.check("customer cancels", canc.ok);
  s.check("cancelled booking frees the place", JSON.parse((await a.c.get(`/api/test-drive/slots?dealer=dl-lhr-1&model=crown-ii&date=${mon}`)).text).slots.find((x) => x.time === time).left === 1);
  s.check("another customer cannot cancel it", (await b.c.post(`/api/test-drive/${r1.id}/cancel`, {})).status !== 200);
  if (bId) await b.c.post(`/api/test-drive/${bId}/cancel`, {}); // leave the slot free for the next run
  const rules = await lhr.put("/api/admin/testdrives", { dealerId: "dl-lhr-1", rules: { enabled: true, models: [], days: [1, 2, 3, 4, 5, 6], from: "10:00", to: "17:00", slotMinutes: 60, capacity: 2 } });
  s.check("dealer edits own store hours", rules.ok);
  s.check("dealer cannot edit another store's hours", (await lhr.put("/api/admin/testdrives", { dealerId: "dl-khi-1", rules: { enabled: true, models: [], days: [1], from: "10:00", to: "12:00", slotMinutes: 60, capacity: 1 } })).status === 404);
  s.check("admin test drives page opens", (await adminC.get("/admin/testdrives")).status === 200);
  const x = await adminC.get("/api/admin/testdrives/export?format=csv");
  s.check("test drives export works", x.status === 200 && /Booking/.test(x.text));
}

/* ── 3 + 4. contact hub and social links ── */
{
  const set = await adminC.put("/api/admin/settings", { company: { name: "Evolta Bikes Zhongxiang", email: "hello@evolta-test.pk", supportEmail: "help@evolta-test.pk", phone: "+92 300 0000000", whatsapp: "923000000000", address: { en: "Test Street, Karachi", ur: "ٹیسٹ اسٹریٹ، کراچی" }, hours: { en: "Mon-Fri 9-5", ur: "پیر تا جمعہ" }, map: "https://maps.app.goo.gl/test" }, social: { tiktok: "https://www.tiktok.com/@evolta_test", facebook: "https://www.facebook.com/evolta_test", instagram: "https://www.instagram.com/evolta_test", youtube: "javascript:alert(1)" } });
  s.check("admin saves contact and social settings", set.ok, JSON.stringify(set));
  const db = readDb();
  s.check("bad social link is dropped", db.settings.social.youtube === "");
  const home = (await client().get("/contact")).text;
  s.check("contact page shows the official email", home.includes("hello@evolta-test.pk"));
  s.check("contact page shows address and map link", home.includes("Test Street, Karachi") && home.includes("maps.app.goo.gl/test"));
  s.check("contact page links to the TikTok profile", home.includes("tiktok.com/@evolta_test"));
  s.check("contact page links to Instagram and Facebook", home.includes("instagram.com/evolta_test") && home.includes("facebook.com/evolta_test"));
  const foot = (await client().get("/")).text;
  s.check("footer shows email and social links on every page", foot.includes("hello@evolta-test.pk") && foot.includes("tiktok.com/@evolta_test"));
  s.check("WhatsApp button appears", foot.includes("wa.me/923000000000"));
  s.check("non-https map link refused", (await adminC.put("/api/admin/settings", { company: { map: "javascript:1" } })).ok && readDb().settings.company.map === null);
  await adminC.put("/api/admin/settings", { company: { name: "Evolta Bikes Zhongxiang", email: "info@evoltabikes.pk", supportEmail: "support@evoltabikes.pk", phone: "+92 21 3456 1200", whatsapp: "923001234567", address: { en: "Plot 12, Shahrah-e-Faisal, PECHS, Karachi, Pakistan", ur: "پلاٹ 12، شاہراہِ فیصل، پی ای سی ایچ ایس، کراچی، پاکستان" }, hours: { en: "Mon – Sat, 10:00 – 18:00", ur: "پیر تا ہفتہ، صبح 10 تا شام 6" } }, social: { tiktok: "https://www.tiktok.com/@evoltabikes", facebook: "https://www.facebook.com/evoltabikes", instagram: "https://www.instagram.com/evoltabikes", youtube: "" } });
}

/* ── 5. partner portal ── */
{
  const c = client();
  const body = { type: "distributor", name: "QA Partner", business: "QA Traders", phone: "03451234567", email: "qa@example.com", city: "multan", experience: "10 years", shop: "showroom", message: "hello" };
  s.check("partner page loads", (await c.get("/partner")).status === 200);
  s.check("bad phone refused", (await c.post("/api/partner", { ...body, phone: "123" })).error === "invalid_phone");
  s.check("unknown type refused", (await c.post("/api/partner", { ...body, type: "king" })).error === "required");
  s.check("bad email refused", (await c.post("/api/partner", { ...body, email: "nope" })).error === "invalid_email");
  const r = await c.post("/api/partner", body);
  s.check("application accepted", r.ok, JSON.stringify(r));
  s.check("applicant gets a confirmation", outboxHas("partner.received", r.id));
  s.check("admin sees it in the pipeline", (await adminC.get("/admin/partners")).text.includes("QA Traders"));
  const rec = readDb().partners.find((p) => p.id === r.id);
  s.check("stored as New", rec?.status === "new" && rec.type === "distributor");
  const up = await adminC.put(`/api/admin/r/partners/${r.id}`, { status: "approved", adminNote: "good fit", assignee: "operator" });
  s.check("admin approves it", up.ok, JSON.stringify(up));
  s.check("approval message queued", outboxHas("partner.approved", r.id));
  s.check("read-only fields cannot be edited", (await adminC.put(`/api/admin/r/partners/${r.id}`, { name: "Hacked" })).ok && readDb().partners.find((p) => p.id === r.id).name === "QA Partner");
  s.check("applicant can't open the admin list", (await c.get("/admin/partners")).status !== 200);
  const one = client();
  let last;
  for (let i = 0; i < 6; i++) last = await one.post("/api/partner", { ...body, name: `Spam ${i}` });
  s.check("partner form is rate limited", last.status === 429, last.status);
  const ex = await adminC.get("/api/admin/r/partners/export?format=xlsx");
  s.check("applications export as a real .xlsx (zip)", ex.status === 200 && ex.text.startsWith("PK"));
}

/* ── enquiry, content pages, blog, sitemap, maintenance ── */
{
  const c = client();
  const e = await c.post("/api/enquiry", { form: "dealership", name: "QA Enq", phone: "03451234567", email: "e@example.com", city: "lahore", message: "Interested in a dealership" });
  s.check("enquiry accepted", e.ok, JSON.stringify(e));
  s.check("enquiry acknowledged", outboxHas("enquiry.received", e.id));
  s.check("enquiry shows in admin", readDb().enquiries.some((x) => x.id === e.id));
  for (const p of ["/p/about", "/returns", "/privacy", "/terms", "/blog", "/blog/how-delivery-works", "/enquiry", "/contact", "/test-drive", "/partner", "/dealers/dl-lhr-1"]) s.check(`${p} opens`, (await c.get(p)).status === 200, (await c.get(p)).status);
  s.check("unknown page is 404", (await c.get("/p/nope-nope")).status === 404);
  const sm = await c.get("/sitemap.xml");
  s.check("sitemap lists models, pages, posts and stores", sm.status === 200 && ["/customize/crown-ii", "/p/about", "/privacy", "/blog/how-delivery-works", "/dealers/dl-lhr-1"].every((u) => sm.text.includes(u)));
  s.check("sitemap hides the admin", !sm.text.includes("/admin"));
  const rb = await c.get("/robots.txt");
  s.check("robots.txt blocks admin and links the sitemap", rb.text.includes("Disallow: /admin") && rb.text.includes("Sitemap:"));
  // page switch → 404 and out of the sitemap
  const pg = readDb().pages.find((p) => p.slug === "about");
  s.check("admin unpublishes a page", (await adminC.put(`/api/admin/r/pages/${pg.id}`, { enabled: false })).ok);
  s.check("unpublished page is gone", (await c.get("/p/about")).status === 404 && !(await c.get("/sitemap.xml")).text.includes("/p/about"));
  await adminC.put(`/api/admin/r/pages/${pg.id}`, { enabled: true });
  s.check("republished page is back", (await c.get("/p/about")).status === 200);
  // new page + nav item appear on the site
  const np = await adminC.post("/api/admin/r/pages", { title: { en: "QA Page", ur: "" }, slug: "qa-page", kind: "page", body: { en: "## Hello QA\nBody **text**", ur: "" }, enabled: true });
  s.check("admin creates a page", np.ok, JSON.stringify(np));
  const qa = await c.get("/p/qa-page");
  s.check("new page renders its Markdown", qa.status === 200 && qa.text.includes("Hello QA") && qa.text.includes("<strong>text</strong>"));
  s.check("reserved slug refused", (await adminC.post("/api/admin/r/pages", { title: { en: "x", ur: "" }, slug: "admin", body: { en: "x", ur: "" } })).error === "reserved");
  s.check("duplicate slug refused", (await adminC.post("/api/admin/r/pages", { title: { en: "x", ur: "" }, slug: "qa-page", body: { en: "x", ur: "" } })).error === "slug_taken");
  const nav = await adminC.post("/api/admin/r/nav", { label: { en: "QA Link", ur: "" }, href: "/p/qa-page", menu: "footer", sort: 99, enabled: true });
  s.check("admin adds a footer link", nav.ok);
  s.check("footer shows the new link at once", (await c.get("/")).text.includes("QA Link"));
  s.check("unsafe link refused", (await adminC.post("/api/admin/r/nav", { label: { en: "Bad", ur: "" }, href: "javascript:alert(1)", menu: "footer" })).error === "invalid_value");
  await adminC.del(`/api/admin/r/nav/${nav.id}`);
  await adminC.del(`/api/admin/r/pages/${np.id}`);
  s.check("deleting removes them from the site", (await c.get("/p/qa-page")).status === 404 && !(await c.get("/")).text.includes("QA Link"));
  // banners and the hero
  const bn = await adminC.post("/api/admin/r/banners", { title: { en: "QA BANNER", ur: "" }, subtitle: { en: "x", ur: "" }, cta: { en: "Go", ur: "" }, href: "/customize", model: "dubhe", glow: "96,150,255", sort: 0, enabled: true });
  s.check("admin creates a banner", bn.ok, JSON.stringify(bn));
  // maintenance
  await adminC.put("/api/admin/settings", { maintenance: true });
  s.check("maintenance shows a notice to visitors", (await client().get("/")).text.includes("be right back"));
  s.check("staff still see the site", !(await adminC.get("/")).text.includes("be right back"));
  await adminC.put("/api/admin/settings", { maintenance: false });
  s.check("site is back after maintenance", !(await client().get("/")).text.includes("be right back"));
  if (bn.id) await adminC.del(`/api/admin/r/banners/${bn.id}`);
}

/* ── admin framework: roles, backups, export, integrations ── */
{
  const role = await adminC.post("/api/admin/roles", { name: { en: `QA Role ${RUN}`, ur: "" }, scope: "all", perms: ["orders.edit"] });
  s.check("admin creates a role", role.ok, JSON.stringify(role));
  const stored = readDb().roles.find((r) => r.id === role.id);
  s.check("a write permission pulls in view", stored.perms.includes("orders.view") && stored.perms.includes("orders.edit"));
  const na = await adminC.post("/api/admin/admins", { username: `qa.${RUN}`, name: "QA Role User", role: role.id, password: "QaRole@2026" });
  s.check("admin creates a user on that role", na.ok, JSON.stringify(na));
  const rc = client();
  s.check("new role user signs in", (await rc.loginAdmin(`qa.${RUN}`, "QaRole@2026")).ok);
  s.check("…can open orders", (await rc.get("/admin/orders")).status === 200);
  s.check("…cannot open banners", (await rc.get("/admin/banners")).status !== 200);
  s.check("…cannot create a banner by API", (await rc.post("/api/admin/r/banners", { title: { en: "x", ur: "" }, href: "/x" })).status === 403);
  s.check("role in use cannot be deleted", (await adminC.del("/api/admin/roles", { id: role.id })).error === "role_in_use");
  s.check("operator cannot manage roles", (await opC.post("/api/admin/roles", { name: { en: "x", ur: "" } })).status === 403);
  const adminRow = readDb().admins.find((a) => a.username === `qa.${RUN}`);
  await adminC.patch("/api/admin/admins", { id: adminRow.id, disabled: true });
  s.check("disabled admin is locked out", !(await client().loginAdmin(`qa.${RUN}`, "QaRole@2026")).ok);
  s.check("last super admin cannot be disabled or demoted", (await adminC.patch("/api/admin/admins", { id: readDb().admins.find((a) => a.username === "admin").id, disabled: true })).status >= 400);
  // reload: the role can now go once its admin is moved away
  await adminC.patch("/api/admin/admins", { id: adminRow.id, role: "operator" });
  s.check("empty role can be deleted", (await adminC.del("/api/admin/roles", { id: role.id })).ok);

  const bk = await adminC.post("/api/admin/backups", { action: "create" });
  s.check("manual backup created", bk.ok && fs.existsSync(path.join(ROOT, "admin pannel", "backups", bk.name)), JSON.stringify(bk));
  s.check("backup downloads", (await adminC.get(`/api/admin/backups?name=${bk.name}`)).status === 200);
  s.check("path traversal refused", (await adminC.get(`/api/admin/backups?name=../../etc/passwd`)).status === 404);
  s.check("restoring an unknown file fails", (await adminC.post("/api/admin/backups", { action: "restore", name: "nope.json" })).status === 404);
  s.check("operator cannot restore", (await opC.post("/api/admin/backups", { action: "restore", name: bk.name })).status === 403);

  const ex = await adminC.get("/api/admin/orders/export");
  s.check("orders export as Excel", ex.status === 200 && ex.text.startsWith("PK"));
  const csv = await adminC.get("/api/admin/orders/export?format=csv");
  s.check("orders export as CSV", csv.status === 200 && csv.text.includes("ZX-PK-"));
  s.check("customers export", (await adminC.get("/api/admin/users/export")).status === 200);
  s.check("customer export has no password hashes", !(await adminC.get("/api/admin/users/export?format=csv")).text.includes("s1$"));

  const integ = await adminC.put("/api/admin/integrations", { payments: { jazzcash: { enabled: true, mode: "sandbox", merchantId: "M123", secret: "TOPSECRET-KEY" }, easypaisa: { enabled: true, mode: "sandbox", merchantId: "", secret: "" } }, social: { google: { enabled: false, clientId: "", secret: "" }, facebook: { enabled: false, clientId: "", secret: "" } }, sms: { enabled: false, provider: "", sender: "EVOLTA", apiKey: "" }, meta: { pixelId: "12345", whatsapp: "", capiToken: "" }, smtp: { enabled: false, host: "", port: 587, user: "", pass: "", from: "x@y.z" }, webmaster: { googleVerification: "", bingVerification: "", analyticsId: "" }, chat: { enabled: true, welcome: { en: "Hi", ur: "" } } });
  s.check("integrations save", integ.ok, JSON.stringify(integ));
  const raw = fs.readFileSync(path.join(ROOT, "admin pannel", "data", "db.json"), "utf8");
  s.check("gateway secret is encrypted at rest", !raw.includes("TOPSECRET-KEY") && raw.includes("enc1:"));
  s.check("secret is masked in the admin page", !(await adminC.get("/admin/integrations")).text.includes("TOPSECRET-KEY"));
  s.check("Meta pixel loads on the site once set", (await client().get("/")).text.includes("12345"));
  await adminC.put("/api/admin/integrations", { ...JSON.parse(JSON.stringify({ payments: readDb().integrations.payments })), social: readDb().integrations.social, sms: readDb().integrations.sms, meta: { pixelId: "", whatsapp: "", capiToken: "" }, smtp: readDb().integrations.smtp, webmaster: readDb().integrations.webmaster, chat: readDb().integrations.chat });

  // generic resources
  const cp = await adminC.post("/api/admin/r/coupons", { code: "qa-10", type: "percent", value: 10, minTotal: 0, maxDiscount: 0, models: [], usageLimit: 0, perUser: 0, enabled: true });
  s.check("coupon created, code upper-cased", cp.ok && readDb().coupons.some((x) => x.code === "QA-10"));
  s.check("duplicate coupon refused", (await adminC.post("/api/admin/r/coupons", { code: "QA-10", type: "percent", value: 5 })).error === "slug_taken");
  s.check("percent over 100 refused", (await adminC.post("/api/admin/r/coupons", { code: "QA-BIG", type: "percent", value: 150 })).error === "invalid_value");
  await adminC.del(`/api/admin/r/coupons/${cp.id}`);
  s.check("PKR base currency is protected", (await adminC.del("/api/admin/r/currencies/PKR")).error === "base_currency");
  s.check("category with models cannot be deleted", (await adminC.del("/api/admin/r/categories/cat-scooter")).error === "in_use");
  s.check("a bulk action works", (await adminC.post("/api/admin/r/templates/bulk", { action: "disable", ids: ["tpl-order.created-sms"] })).ok);
  await adminC.post("/api/admin/r/templates/bulk", { action: "enable", ids: ["tpl-order.created-sms"] });
  s.check("audit log recorded the changes", readDb().audit.length > 20);
  s.check("health check runs", (await adminC.post("/api/admin/health", {})).ok);
  s.check("cache clear works", (await adminC.post("/api/admin/cache", {})).ok);
}

/* ── live chat and the banner-driven hero ── */
{
  const v = client();
  const w = JSON.parse((await v.get("/api/chat")).text);
  s.check("chat widget is on and has a welcome", w.enabled === true && !!w.welcome.en);
  s.check("home page carries the chat widget", (await v.get("/")).text.includes("Live chat"));
  s.check("empty chat message refused", !(await v.post("/api/chat", { text: "  " })).ok);
  s.check("visitor sends a message", (await v.post("/api/chat", { text: `Hello from QA ${RUN}` })).ok);
  const mine = JSON.parse((await v.get("/api/chat")).text).messages;
  s.check("visitor sees their own conversation", mine.length === 1 && mine[0].from === "visitor");
  const other = JSON.parse((await client().get("/api/chat")).text).messages;
  s.check("another visitor sees nothing of it", other.length === 0);
  const chat = readDb().chats.find((x) => x.messages.some((m) => m.text === `Hello from QA ${RUN}`));
  s.check("message reaches the admin inbox with an unread count", !!chat && chat.unread >= 1);
  s.check("admin chat page opens", (await adminC.get("/admin/chat")).status === 200);
  s.check("staff reply", (await adminC.post("/api/admin/chat", { id: chat.id, text: "Hi, how can we help?" })).ok);
  s.check("visitor receives the reply", JSON.parse((await v.get("/api/chat")).text).messages.some((m) => m.from === "admin" && m.text.startsWith("Hi, how")));
  s.check("unread cleared by the reply", readDb().chats.find((x) => x.id === chat.id).unread === 0);
  s.check("dealer role cannot reply", !(await lhr.post("/api/admin/chat", { id: chat.id, text: "x" })).ok);
  // banners drive the hero
  const title = `HERO ${RUN}`;
  const bn = await adminC.post("/api/admin/r/banners", { title: { en: title, ur: "" }, subtitle: { en: "sub", ur: "" }, cta: { en: "Go", ur: "" }, href: "/customize", model: "dubhe", glow: "96,150,255", sort: 0, enabled: true });
  s.check("a new banner shows in the home hero", (await client().get("/")).text.includes(title));
  await adminC.put(`/api/admin/r/banners/${bn.id}`, { enabled: false });
  s.check("a disabled banner leaves the hero", !(await client().get("/")).text.includes(title));
  await adminC.put(`/api/admin/r/banners/${bn.id}`, { enabled: true, end: new Date(Date.now() - 3600000).toISOString() });
  s.check("an expired banner leaves the hero", !(await client().get("/")).text.includes(title));
  await adminC.del(`/api/admin/r/banners/${bn.id}`);
}

const out = s.done();
process.exit(out.failed ? 1 : 0);
