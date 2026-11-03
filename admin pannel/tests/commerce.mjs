// Commerce features on the customer site that the admin controls: coupons at checkout (more added below as they are built).
import { ADMINS, BASE, client, readDb, suite } from "./lib.mjs";

const s = suite("commerce");
const adminC = client();
await adminC.loginAdmin(...ADMINS.super);
const RUN = Math.random().toString(36).slice(2, 6).toUpperCase();
const fresh = async (tag) => {
  const c = client();
  const phone = `03${String(Math.floor(100000000 + Math.random() * 899999999)).slice(0, 9)}`;
  const r = await c.post("/api/auth/register", { name: `QA ${tag}`, phone, password: "QaTest@2026", city: "lahore" });
  s.check(`register ${tag}`, r.ok, JSON.stringify(r));
  return { c, phone };
};
const quote = async (c, model, config = {}) => (await c.post("/api/quotes", { model, config })).id;
const order = (c, quoteId, phone, coupon) => c.post("/api/orders", { quoteId, contact: { name: "QA Coupon", phone, city: "lahore" }, coupon });
const rec = (id) => readDb().orders.find((o) => o.id === id);
const cp = (code) => readDb().coupons.find((x) => x.code === code);
const stock = (m) => readDb().factoryStock[m];

/* ── coupons ── */
{
  const P = `QA${RUN}P`;
  const F = `QA${RUN}F`;
  const L = `QA${RUN}L`;
  const M = `QA${RUN}M`;
  const X = `QA${RUN}X`;
  const mk = async (body) => (await adminC.post("/api/admin/r/coupons", { minTotal: 0, maxDiscount: 0, models: [], usageLimit: 0, perUser: 0, enabled: true, ...body })).id;
  const idP = await mk({ code: P, type: "percent", value: 10, maxDiscount: 15000 });
  const idF = await mk({ code: F, type: "fixed", value: 5000 });
  const idL = await mk({ code: L, type: "fixed", value: 1000, usageLimit: 1 });
  const idM = await mk({ code: M, type: "fixed", value: 1000, models: ["phoenix"] });
  const idX = await mk({ code: X, type: "fixed", value: 1000, end: "2020-01-01" });
  const ids = [idP, idF, idL, idM, idX];

  const { c, phone } = await fresh("coupon");
  const q = await quote(c, "crown-ii");
  const base = readDb().quotes.find((x) => x.id === q).total;

  const chk = (code, quoteId = q) => c.post("/api/coupons/check", { quoteId, code });
  const guest = client();
  s.check("check needs a login", (await guest.post("/api/coupons/check", { quoteId: q, code: P })).status === 401);
  const a = await chk(P.toLowerCase());
  s.check("percent coupon, any letter case", a.ok && a.code === P, JSON.stringify(a));
  s.check("percent is capped by max discount", a.discount === 15000 && a.total === base - 15000, `${a.discount} / base ${base}`);
  const f = await chk(F);
  s.check("fixed coupon takes its amount off", f.ok && f.discount === 5000 && f.total === base - 5000);
  s.check("deposit follows the discounted total", f.deposit === Math.round((f.total * readDb().settings.depositPercent) / 100 / 100) * 100, `${f.deposit}`);
  s.check("unknown code refused", (await chk("NOPE-NOPE")).error === "coupon_invalid");
  s.check("empty code refused", (await chk("  ")).error === "coupon_invalid");
  s.check("expired coupon refused", (await chk(X)).error === "coupon_expired");
  s.check("coupon for another model refused", (await chk(M)).error === "coupon_model");
  s.check("coupon above the total minimum refused", (await (async () => {
    await adminC.put(`/api/admin/r/coupons/${idF}`, { minTotal: base + 1 });
    const r = await chk(F);
    await adminC.put(`/api/admin/r/coupons/${idF}`, { minTotal: 0 });
    return r.error === "coupon_min";
  })()));
  s.check("disabled coupon refused", (await (async () => {
    await adminC.put(`/api/admin/r/coupons/${idF}`, { enabled: false });
    const r = await chk(F);
    await adminC.put(`/api/admin/r/coupons/${idF}`, { enabled: true });
    return r.error === "coupon_invalid";
  })()));
  const other = await fresh("other");
  s.check("another customer's quote cannot be probed", (await other.c.post("/api/coupons/check", { quoteId: q, code: P })).status === 404);

  // placing the order
  const stock0 = stock("crown-ii");
  const o1 = await order(c, q, phone, P);
  s.check("order placed with a coupon", o1.ok, JSON.stringify(o1));
  const r1 = rec(o1.id);
  s.check("order stores discount and code", r1.discount === 15000 && r1.couponCode === P);
  s.check("order total is the discounted total", r1.total === base - 15000);
  s.check("deposit is worked out on the discounted total", r1.deposit === Math.round((r1.total * r1.depositPercent) / 100 / 100) * 100);
  s.check("coupon use counted", cp(P).used === 1);
  s.check("customer order page shows the discount", (await c.get(`/orders/${o1.id}`)).text.includes(P));
  s.check("admin invoice shows the coupon line", (await adminC.get(`/admin/orders/${o1.id}/invoice`)).text.includes(P));

  // cancelling gives the use back
  s.check("customer cancels", (await c.post(`/api/orders/${o1.id}/cancel`, {})).ok);
  s.check("cancel returns the coupon use", cp(P).used === 0);
  s.check("cancel returns the stock", stock("crown-ii") === stock0);

  // rules enforced at order time, nothing is reserved on failure
  const stockBefore = stock("crown-ii");
  const bad = await order(c, q, phone, X);
  s.check("expired coupon refused at order", !bad.ok && bad.error === "coupon_expired", JSON.stringify(bad));
  s.check("failed coupon reserves nothing", stock("crown-ii") === stockBefore && cp(X).used === 0);
  const fake = await order(c, q, phone, "NO-SUCH-CODE");
  s.check("made-up code refused at order", fake.error === "coupon_invalid");
  const plain = await order(c, q, phone);
  s.check("order without a coupon still works", plain.ok && rec(plain.id).total === base && !rec(plain.id).discount);
  await c.post(`/api/orders/${plain.id}/cancel`, {});

  // usage limit
  const u1 = await fresh("limit1");
  const u2 = await fresh("limit2");
  const uq1 = await quote(u1.c, "crown-ii");
  const uq2 = await quote(u2.c, "crown-ii");
  const l1 = await order(u1.c, uq1, u1.phone, L);
  s.check("limited coupon works once", l1.ok);
  const l2 = await order(u2.c, uq2, u2.phone, L);
  s.check("limited coupon refused after its limit", l2.error === "coupon_used_up", JSON.stringify(l2));
  await u1.c.post(`/api/orders/${l1.id}/cancel`, {});
  const l3 = await order(u2.c, uq2, u2.phone, L);
  s.check("a cancelled order frees the use again", l3.ok, JSON.stringify(l3));
  await u2.c.post(`/api/orders/${l3.id}/cancel`, {});

  // one use per customer
  await adminC.put(`/api/admin/r/coupons/${idF}`, { perUser: 1 });
  const pq1 = await quote(u1.c, "crown-ii");
  const pq2 = await quote(u1.c, "crown-ii");
  const p1 = await order(u1.c, pq1, u1.phone, F);
  s.check("per-customer coupon works the first time", p1.ok, JSON.stringify(p1));
  const p2 = await order(u1.c, pq2, u1.phone, F);
  s.check("per-customer coupon refused the second time", p2.error === "coupon_per_user", JSON.stringify(p2));
  await u1.c.post(`/api/orders/${p1.id}/cancel`, {});

  // admin cancel gives the use back
  const aq = await quote(u2.c, "crown-ii");
  const ao = await order(u2.c, aq, u2.phone, P);
  const usedBefore = cp(P).used;
  await adminC.patch(`/api/admin/orders/${ao.id}`, { action: "cancel" });
  s.check("staff cancel returns the coupon use", usedBefore === 1 && cp(P).used === 0, `${usedBefore} → ${cp(P).used}`);

  for (const id of ids) await adminC.del(`/api/admin/r/coupons/${id}`);
}

/* ── 360° viewer ── */
{
  const site = client();
  const live = readDb().models.filter((m) => m.enabled).map((m) => m.slug);
  const unescape = (t) => t.replaceAll("\\", "");
  let withSpin = 0;
  for (const slug of live) {
    const html = (await site.get(`/customize/${slug}`)).text;
    if (/360°<\/span>/.test(html)) withSpin++;
  }
  s.check("every live model offers the 360° view", withSpin === live.length, `${withSpin}/${live.length}`);
  const alk = unescape((await site.get("/customize/alkaid")).text);
  s.check("angle shots come with the mirrored side", /"flip":true/.test(alk) && /"flip":false/.test(alk));
  s.check("the page says it is not a smooth set yet", /"smooth":false/.test(alk));
  s.check("each angle carries where the bike sits", /"box":\[0\.\d+,0\.\d+,0\.\d+,0\.\d+\]/.test(alk));

  // a full turntable set uploaded in the admin replaces the angle shots
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAHsyqbQAAAABJRU5ErkJggg==", "base64");
  const urls = [];
  for (let i = 0; i < 12; i++) {
    const fd = new FormData();
    fd.append("file", new Blob([png], { type: "image/png" }), `${String(i + 1).padStart(3, "0")}.png`);
    const r = await adminC.req("/api/admin/upload", { method: "POST", body: fd, headers: { origin: BASE } });
    const j = await r.json();
    if (j.ok) urls.push(j.url);
  }
  s.check("twelve frames upload", urls.length === 12, String(urls.length));
  const before = readDb().models.find((m) => m.slug === "crown-ii").spin ?? [];
  s.check("admin saves the set", (await adminC.put("/api/admin/models", { slug: "crown-ii", patch: { spin: urls } })).ok);
  const full = unescape((await site.get("/customize/crown-ii")).text);
  s.check("the page now turns through the uploaded frames", urls.every((u) => full.includes(u)) && /"smooth":true/.test(full));
  s.check("the angle shots are no longer used for it", !/"src":"\/products\/crown-ii\/gallery/.test(full));
  s.check("a link that is not an uploaded file is dropped", (await adminC.put("/api/admin/models", { slug: "crown-ii", patch: { spin: ["https://evil.example/x.png", urls[0]] } })).ok && (readDb().models.find((m) => m.slug === "crown-ii").spin ?? []).length === 1);
  s.check("one frame alone is not a spin: back to the angle shots", /"src":"\/products\/crown-ii\/gallery/.test(unescape((await site.get("/customize/crown-ii")).text)));
  await adminC.put("/api/admin/models", { slug: "crown-ii", patch: { spin: before } });
  s.check("clearing the set restores the angle shots", /"smooth":false/.test(unescape((await site.get("/customize/crown-ii")).text)));
}

/* ── model page: views, similar models, list sorting ── */
{
  const site = client();
  const v0 = readDb().models.find((m) => m.slug === "crown-ii").views ?? 0;
  s.check("a visit is counted", (await site.post("/api/models/view", { model: "crown-ii" })).ok && (readDb().models.find((m) => m.slug === "crown-ii").views ?? 0) === v0 + 1);
  s.check("unknown model not counted", (await site.post("/api/models/view", { model: "nope" })).status === 404);
  const pg = (await site.get("/customize/crown-ii")).text;
  s.check("similar models section shows", /You may also like/.test(pg) && /aria-labelledby="similar-h"/.test(pg));
  const old = readDb().models.find((m) => m.slug === "crown-ii").related ?? [];
  const pick = readDb().models.filter((m) => m.slug !== "crown-ii" && m.kind !== readDb().models.find((x) => x.slug === "crown-ii").kind)[0];
  if (pick) {
    s.check("admin picks a related model", (await adminC.put("/api/admin/models", { slug: "crown-ii", patch: { related: [pick.slug] } })).ok);
    s.check("picked model leads the similar list", (await site.get("/customize/crown-ii")).text.includes(`/customize/${pick.slug}`));
    await adminC.put("/api/admin/models", { slug: "crown-ii", patch: { related: old } });
  }
  const list = (await site.get("/customize")).text;
  s.check("model list has sorting and search", /Sort by/.test(list) && /Search models/.test(list));
}

/* ── payment methods follow the Integrations switches ── */
{
  const setPay = (jc, ep) => {
    const i = readDb().integrations;
    return adminC.put("/api/admin/integrations", { payments: { jazzcash: { ...i.payments.jazzcash, enabled: jc }, easypaisa: { ...i.payments.easypaisa, enabled: ep } }, social: i.social, sms: i.sms, meta: i.meta, smtp: i.smtp, webmaster: i.webmaster, chat: i.chat });
  };
  const { c, phone } = await fresh("pay");
  const q = await quote(c, "crown-ii");
  const o = await order(c, q, phone);
  const radios = async () => ((await c.get(`/orders/${o.id}`)).text.match(/role="radio"/g) ?? []).length;
  s.check("all four methods offered by default", (await radios()) === 4, String(await radios()));
  s.check("admin switches JazzCash off", (await setPay(false, true)).ok);
  s.check("order page offers three methods", (await radios()) === 3);
  s.check("paying with a switched-off method is refused", (await c.post(`/api/orders/${o.id}/pay`, { method: "jazzcash" })).error === "method_disabled");
  s.check("order still unpaid after refusal", rec(o.id).status === "pending_payment" && !rec(o.id).payment);
  s.check("admin switches both mobile wallets off", (await setPay(false, false)).ok);
  s.check("order page offers bank and card only", (await radios()) === 2);
  await setPay(true, true);
  s.check("methods restored", (await radios()) === 4);
  const pay = await c.post(`/api/orders/${o.id}/pay`, { method: "jazzcash" });
  s.check("an enabled method is accepted", pay.ok, JSON.stringify(pay));
  await adminC.patch(`/api/admin/orders/${o.id}`, { action: "cancel" });
}

/* ── shipping estimate ── */
{
  const z = readDb().zones.find((x) => x.id === "zone-punjab");
  const { c, phone } = await fresh("ship");
  const q = await quote(c, "crown-ii");
  const page = await c.get(`/checkout/${q}`);
  // the page data is embedded as escaped JSON, so drop the backslashes before looking
  const hasCost = (text, n) => text.replaceAll("\\", "").includes(`"baseCost":${n}`);
  s.check("checkout carries the zone rules", page.status === 200 && hasCost(page.text, z.baseCost), String(page.status));
  s.check("admin changes a zone charge", (await adminC.put("/api/admin/r/zones/zone-punjab", { baseCost: 15500 })).ok);
  s.check("checkout shows the new charge", hasCost((await c.get(`/checkout/${q}`)).text, 15500));
  const o = await order(c, q, phone);
  s.check("order stores the estimate for its city", o.ok && rec(o.id).shipping === 15500, JSON.stringify(rec(o.id)?.shipping));
  s.check("estimate is not added to the price", rec(o.id).total === readDb().quotes.find((x) => x.id === q).total);
  await adminC.put("/api/admin/r/zones/zone-punjab", { enabled: false });
  s.check("a disabled zone leaves the checkout", !hasCost((await c.get(`/checkout/${q}`)).text, 15500));
  await adminC.put("/api/admin/r/zones/zone-punjab", { enabled: true, baseCost: z.baseCost });
  await c.post(`/api/orders/${o.id}/cancel`, {});
}

/* ── currency switcher ── */
{
  const site = client();
  const opts = async () => [...(await site.get("/customize")).text.matchAll(/<option value="([A-Z]{3})"/g)].map((m) => m[1]);
  const before = await opts();
  s.check("switcher lists PKR and the enabled currencies", before[0] === "PKR" && before.includes("USD"), before.join(","));
  s.check("a disabled currency is not offered", !before.includes("EUR"));
  s.check("admin disables USD", (await adminC.put("/api/admin/r/currencies/USD", { enabled: false })).ok);
  s.check("USD leaves the switcher", !(await opts()).includes("USD"));
  s.check("admin enables EUR", (await adminC.put("/api/admin/r/currencies/EUR", { enabled: true })).ok);
  s.check("EUR joins the switcher", (await opts()).includes("EUR"));
  await adminC.put("/api/admin/r/currencies/USD", { enabled: true });
  await adminC.put("/api/admin/r/currencies/EUR", { enabled: false });
  s.check("original currencies restored", (await opts()).join() === before.join());
  s.check("a price is still charged in PKR", (await site.get("/customize")).text.includes("PKR"));
}

/* ── reviews ── */
const rv = await fresh("review");
const marker = `QA-REVIEW-${RUN}`;
{
  const guest = client();
  s.check("guest cannot review", (await guest.post("/api/reviews", { model: "crown-ii", rating: 5, body: marker + " good bike" })).status === 401);
  s.check("rating is required", (await rv.c.post("/api/reviews", { model: "crown-ii", body: "long enough text here" })).error === "rating_required");
  s.check("rating above 5 refused", (await rv.c.post("/api/reviews", { model: "crown-ii", rating: 9, body: "long enough text here" })).error === "rating_required");
  s.check("very short review refused", (await rv.c.post("/api/reviews", { model: "crown-ii", rating: 4, body: "ok" })).error === "review_short");
  s.check("unknown model refused", (await rv.c.post("/api/reviews", { model: "no-such-bike", rating: 4, body: "long enough text here" })).status === 404);
  const r = await rv.c.post("/api/reviews", { model: "crown-ii", rating: 4, title: "Smooth ride", body: `${marker} smooth and quiet <b>bold</b>` });
  s.check("review accepted", r.ok, JSON.stringify(r));
  const row = readDb().reviews.find((x) => x.body.includes(marker));
  s.check("new review waits for approval", row?.status === "pending" && row.model === "crown-ii" && row.rating === 4);
  s.check("pending review is not public", !(await client().get("/customize/crown-ii")).text.includes(marker));
  s.check("only one review per customer per model", (await rv.c.post("/api/reviews", { model: "crown-ii", rating: 5, body: "second try with enough text" })).error === "review_exists");
  s.check("owner is told it was already reviewed", /already reviewed/.test((await rv.c.get("/customize/crown-ii")).text));
  s.check("admin approves it", (await adminC.put(`/api/admin/r/reviews/${row.id}`, { status: "approved" })).ok);
  const page = (await client().get("/customize/crown-ii")).text;
  s.check("approved review shows on the model page", page.includes(marker));
  s.check("review text is escaped, not HTML", !page.includes("<b>bold</b>"));
  s.check("page shows the average rating", /4\.0/.test(page) && /1 reviews|\(1 reviews\)/.test(page));
  s.check("admin rejects it", (await adminC.put(`/api/admin/r/reviews/${row.id}`, { status: "rejected" })).ok);
  s.check("rejected review leaves the page", !(await client().get("/customize/crown-ii")).text.includes(marker));
  s.check("customer may try again after a rejection", (await rv.c.post("/api/reviews", { model: "crown-ii", rating: 5, body: `${marker} second attempt` })).ok);
  for (const x of readDb().reviews.filter((y) => y.body.includes(marker))) await adminC.del(`/api/admin/r/reviews/${x.id}`);
  await new Promise((r) => setTimeout(r, 400)); // the data file is written a moment after the response
  s.check("test reviews removed", !readDb().reviews.some((y) => y.body.includes(marker)));
}

/* ── wishlist ── */
{
  const w = rv;
  const mine = () => readDb().users.find((u) => u.phone.endsWith(w.phone.slice(-9)))?.wishlist ?? [];
  s.check("guest cannot save", (await client().post("/api/wishlist", { model: "crown-ii", on: true })).status === 401);
  s.check("unknown model refused", (await w.c.post("/api/wishlist", { model: "nope", on: true })).status === 404);
  const a = await w.c.post("/api/wishlist", { model: "crown-ii", on: true });
  s.check("model saved", a.ok && a.list.includes("crown-ii"));
  s.check("saving twice keeps one entry", ((await w.c.post("/api/wishlist", { model: "crown-ii", on: true })).list.filter((x) => x === "crown-ii").length) === 1);
  await w.c.post("/api/wishlist", { model: "phoenix", on: true });
  s.check("stored on the customer", mine().includes("crown-ii") && mine().includes("phoenix"));
  s.check("account page lists the saved model", /Saved models/.test((await w.c.get("/account")).text) && (await w.c.get("/account")).text.includes("CROWN II") || (await w.c.get("/account")).text.includes("Crown II"));
  s.check("heart is filled for the owner on the model page", /aria-label="Remove from wishlist"/.test((await w.c.get("/customize/crown-ii")).text));
  s.check("heart is not filled for a guest", !/aria-label="Remove from wishlist"/.test((await client().get("/customize/crown-ii")).text));
  s.check("model removed", !(await w.c.post("/api/wishlist", { model: "crown-ii", on: false })).list.includes("crown-ii"));
  const uid = readDb().users.find((u) => u.phone.endsWith(w.phone.slice(-9))).id;
  const adm = await adminC.get("/admin/users");
  s.check("admin customer list still loads", adm.status === 200);
  await w.c.post("/api/wishlist", { model: "phoenix", on: false });
  s.check("wishlist empty again", mine().length === 0, uid);
}

const out = s.done();
process.exit(out.failed ? 1 : 0);
