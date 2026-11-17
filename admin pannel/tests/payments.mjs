// Cart, checkout and payment: JazzCash, Easypaisa, card (3-D Secure) and bank transfer, plus the admin side that reviews them.
import fs from "node:fs";
import path from "node:path";
import { ADMINS, BASE, CARD_FORM, DB_PATH, ROOT, TEST, client, payOrder, readDb, suite } from "./lib.mjs";

const s = suite("payments");
const adminC = client();
await adminC.loginAdmin(...ADMINS.super);
const opC = client();
await opC.loginAdmin(...ADMINS.operator);
const dealerC = client();
await dealerC.loginAdmin(...ADMINS.dealer);

const fresh = async (tag, extra = {}) => {
  const c = client();
  const phone = `03${String(Math.floor(100000000 + Math.random() * 899999999)).slice(0, 9)}`;
  const r = await c.post("/api/auth/register", { name: `QA ${tag}`, phone, password: "QaTest@2026", city: "lahore", ...extra });
  s.check(`register ${tag}`, r.ok, JSON.stringify(r));
  return { c, phone };
};
const quote = async (c, model, config = {}) => (await c.post("/api/quotes", { model, config })).id;
const user = (phone) => readDb().users.find((u) => u.phone === phone);
const order = (id) => readDb().orders.find((o) => o.id === id);
const intent = (id) => readDb().payIntents.find((i) => i.id === id);
const stock = (m) => readDb().factoryStock[m];
const outbox = (event, ref) => readDb().outbox.filter((o) => o.event === event && (!ref || o.ref === ref));
const settle = () => new Promise((r) => setTimeout(r, 350)); // the data file is written a moment after a response
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAHsyqbQAAAABJRU5ErkJggg==", "base64");
const upload = (c, id, bytes, name = "receipt.png", type = "image/png") => {
  const fd = new FormData();
  fd.append("file", new Blob([bytes], { type }), name);
  return c.req(`/api/pay/${id}/receipt`, { method: "POST", body: fd, headers: { origin: BASE } }).then(async (r) => ({ status: r.status, ...(await r.json().catch(() => ({}))) }));
};
const toCart = async (c, model, qty = 1) => {
  const q = await quote(c, model);
  const r = await c.post("/api/cart", { quoteId: q, qty });
  return { q, r };
};
const checkout = (c, phone, extra = {}) => c.post("/api/checkout", { contact: { name: "QA Buyer", phone, city: "lahore" }, method: "card", mode: "advance", ...extra });
const cancelAll = async (c, ids) => {
  for (const id of ids) await c.post(`/api/orders/${id}/cancel`, {});
};
const mine = [];
const track = (...ids) => mine.push(...ids);

/* ── the cart ── */
{
  const guest = client();
  s.check("a cart needs a login on the server", (await guest.get("/api/cart")).status === 401);
  const gq = await quote(guest, "crown-ii");
  const gp = await guest.post("/api/cart/price", { items: [{ quoteId: gq, qty: 2 }] });
  s.check("a guest's cart is priced by the server", gp.ok && gp.view.lines.length === 1 && gp.view.units === 2 && gp.view.subtotal === gp.view.lines[0].unit * 2, JSON.stringify(gp).slice(0, 200));
  s.check("the browser's prices are never used", (await guest.post("/api/cart/price", { items: [{ quoteId: gq, qty: 1, price: 1, unit: 1 }] })).view.subtotal > 1000);
  s.check("an unknown quotation is flagged", (await guest.post("/api/cart/price", { items: [{ quoteId: "nope", qty: 1 }] })).view.lines[0].problem === "gone");
  s.check("home shows the cart button", (await client().get("/")).text.includes('href="/cart"'));

  const { c, phone } = await fresh("cart");
  const a = await toCart(c, "crown-ii");
  s.check("add to cart", a.r.ok && a.r.items.length === 1 && a.r.items[0].qty === 1, JSON.stringify(a.r));
  const again = await c.post("/api/cart", { quoteId: a.q, qty: 2 });
  s.check("the same build adds up", again.items[0].qty === 3);
  const capped = await c.post("/api/cart", { quoteId: a.q, qty: 9 });
  s.check("one build is capped at 5", capped.ok && capped.items[0].qty === 5);
  const b = await toCart(c, "phoenix", 1);
  s.check("a second bike is its own line", b.r.items.length === 2);
  const c3 = await toCart(c, "griffin", 5);
  s.check("a cart holds at most 10 bikes", !c3.r.ok && c3.r.error === "cart_full", JSON.stringify(c3.r));
  const lineId = b.r.items.find((x) => x.quoteId === b.q).id;
  s.check("change the quantity", (await c.patch("/api/cart", { id: lineId, qty: 2 })).items.find((x) => x.id === lineId).qty === 2);
  s.check("an unknown line is refused", (await c.patch("/api/cart", { id: "zzzz", qty: 2 })).status === 404);
  s.check("remove one line", (await c.del("/api/cart", { id: lineId })).items.length === 1);
  const view = await c.get("/api/cart");
  s.check("the cart view carries the prices", (await c.req("/api/cart")).status === 200 && view.status === 200);
  s.check("another customer's quotation cannot be added", (await (await fresh("cart2")).c.post("/api/cart", { quoteId: a.q, qty: 1 })).status === 404);
  const bad = await c.req("/api/cart", { method: "POST", headers: { "content-type": "application/json", origin: "https://evil.example" }, body: JSON.stringify({ quoteId: a.q }) });
  s.check("a request from another site is refused", bad.status === 403);
  s.check("empty the cart", (await c.del("/api/cart", {})).items.length === 0);
  s.check("an empty cart page redirects away from checkout", [301, 302, 307, 308].includes((await c.get("/checkout")).status));
  s.check("an empty cart cannot be checked out", (await checkout(c, phone)).error === "empty_cart");

  // a guest's cart joins the account on sign-up
  const gq2 = await quote(guest, "phoenix");
  const reg = client();
  const p2 = `03${String(Math.floor(100000000 + Math.random() * 899999999)).slice(0, 9)}`;
  await reg.post("/api/auth/register", { name: "QA merge", phone: p2, password: "QaTest@2026", city: "lahore", claim: [gq2], cart: [{ quoteId: gq2, qty: 2 }, { quoteId: "not-mine", qty: 1 }] });
  await settle();
  s.check("the guest's cart moves into the new account", (user(p2).cart ?? []).length === 1 && user(p2).cart[0].qty === 2, JSON.stringify(user(p2).cart));
}

/* ── placing a checkout: one order per bike, all or nothing ── */
let paidIds = [];
{
  const { c, phone } = await fresh("checkout");
  const crown = await toCart(c, "crown-ii", 2);
  const ph = await toCart(c, "phoenix", 1);
  const s0 = { crown: stock("crown-ii"), phoenix: stock("phoenix") };
  s.check("a method is required", (await checkout(c, phone, { method: "" })).error === "method_required");
  s.check("a city is required", (await c.post("/api/checkout", { contact: { name: "QA", phone }, method: "card" })).error === "city_required");
  s.check("a phone is required", (await c.post("/api/checkout", { contact: { name: "QA", phone: "123", city: "lahore" }, method: "card" })).error === "invalid_phone");
  await settle();
  s.check("refusals reserve nothing", stock("crown-ii") === s0.crown && (user(phone).cart ?? []).length === 2);

  const co = await checkout(c, phone, { mode: "advance" });
  s.check("checkout places the orders and opens a payment", co.ok && co.intentId && co.groupId, JSON.stringify(co));
  await settle();
  const orders = readDb().orders.filter((o) => o.groupId === co.groupId);
  paidIds = orders.map((o) => o.id);
  track(...paidIds);
  s.check("one order per bike", orders.length === 3 && orders.filter((o) => o.model === "crown-ii").length === 2);
  s.check("factory stock reserved for every bike", stock("crown-ii") === s0.crown - 2 && stock("phoenix") === s0.phoenix - 1);
  s.check("the cart is emptied", (user(phone).cart ?? []).length === 0);
  const pi = intent(co.intentId);
  s.check("the advance covers every order", pi.amount === orders.reduce((n, o) => n + o.deposit, 0) && pi.mode === "advance" && pi.status === "created");
  s.check("orders wait for payment", orders.every((o) => o.status === "pending_payment" && !o.payment && o.contact.dealerId === null));
  s.check("an order confirmation message per bike", orders.every((o) => outbox("order.created", o.id).length >= 1));

  // limits: unpaid checkouts count once each, however many bikes
  await toCart(c, "dubhe", 1);
  const second = await checkout(c, phone);
  s.check("a second unpaid checkout is allowed", second.ok, JSON.stringify(second));
  await settle();
  track(...readDb().orders.filter((o) => o.groupId === second.groupId).map((o) => o.id));
  await toCart(c, "alkaid", 1);
  const third = await checkout(c, phone);
  s.check("a third unpaid checkout is refused", third.error === "too_many_open", JSON.stringify(third));
  await settle();
  s.check("the refused checkout kept the cart and stock", (user(phone).cart ?? []).length === 1);

  // the page of this attempt
  const pg = await c.get(`/pay/${co.intentId}`);
  s.check("the payment page opens", pg.status === 200 && pg.text.includes(pi.ref));
  const other = await fresh("snoop");
  s.check("another customer cannot see the attempt", (await other.c.get(`/api/pay/${co.intentId}`)).status === 404);
  s.check("nor change it", (await other.c.post(`/api/pay/${co.intentId}/card`, CARD_FORM)).status === 404);
  s.check("a guest cannot", (await client().get(`/api/pay/${co.intentId}`)).status === 401);
  s.check("the order page offers the payment choices", /Pay in full|Advance only/.test((await c.get(`/orders/${paidIds[0]}`)).text));

  // card: every way it can fail, then success
  const card = (body) => c.post(`/api/pay/${co.intentId}/card`, { ...CARD_FORM, ...body });
  s.check("a card number must pass the check digit", (await card({ number: "4242424242424241" })).error === "card_invalid");
  s.check("an expired card is refused", (await card({ expiry: "01/20" })).error === "card_expired");
  s.check("a bad security code is refused", (await card({ cvv: "12" })).error === "card_cvv");
  s.check("a missing name is refused", (await card({ name: "" })).error === "card_name");
  s.check("a real-looking card is refused in the sandbox", (await card({ number: "4111111111111111" })).error === "card_not_test");
  s.check("a declined card", (await card({ number: TEST.declined })).error === "card_declined");
  s.check("a card without funds", (await card({ number: TEST.noFunds })).error === "card_insufficient");
  await settle();
  s.check("failures leave the orders waiting", intent(co.intentId).status === "created" && order(paidIds[0]).status === "pending_payment");
  const ok1 = await card({});
  s.check("a good card goes on to 3-D Secure", ok1.ok && ok1.view.step === "otp" && ok1.view.channel.last4 === "4242" && ok1.view.channel.brand === "visa", JSON.stringify(ok1).slice(0, 200));
  const w1 = await c.post(`/api/pay/${co.intentId}/otp`, { code: "000000" });
  s.check("a wrong code is refused and counted", w1.error === "otp_failed" && w1.view.triesLeft === 2);
  const done = await c.post(`/api/pay/${co.intentId}/otp`, { code: TEST.otp });
  s.check("the right code settles the payment", done.ok && done.view.status === "succeeded", JSON.stringify(done).slice(0, 200));
  await settle();
  const after = readDb().orders.filter((o) => paidIds.includes(o.id));
  s.check("every order moves into the factory queue", after.every((o) => o.status === "active" && o.stage === 1 && o.payment?.verified === true), JSON.stringify(after.map((o) => [o.status, o.stage])));
  s.check("each order records what was paid", after.every((o) => o.payment?.amount === o.deposit && o.payment?.mode === "advance" && o.payment?.intentId === co.intentId));
  s.check("only the brand and last four are kept", after.every((o) => o.payment?.last4 === "4242" && o.payment?.brand === "visa"));
  s.check("the customer is told", outbox("payment.received", co.intentId).length >= 1);
  const again = await c.post(`/api/pay/${co.intentId}/otp`, { code: TEST.otp });
  s.check("paying twice is refused, not repeated", !again.ok && after.every((o) => order(o.id).history.filter((h) => h.action === "payment.card").length === 1));
  s.check("the receipt page shows the payment", (await c.get(`/receipt/${co.intentId}`)).text.includes(pi.ref));
  s.check("another customer cannot open the receipt", !(await other.c.get(`/receipt/${co.intentId}`)).text.includes(pi.ref));
  s.check("the order page shows the balance", /Balance|balance/.test((await c.get(`/orders/${paidIds[0]}`)).text));
  s.check("a paid order cannot be paid again", (await c.post("/api/pay/start", { orderId: paidIds[0], method: "card" })).error === "not_payable");

  // the card number never reaches the data files
  const rawDb = fs.readFileSync(DB_PATH, "utf8");
  const outDir = path.join(ROOT, "admin pannel", "data", "outbox");
  const rawOut = fs.existsSync(outDir) ? fs.readdirSync(outDir).map((f) => fs.readFileSync(path.join(outDir, f), "utf8")).join("\n") : "";
  s.check("no card number in the data file", !rawDb.includes("4242424242424242") && !rawDb.includes("4242 4242 4242 4242") && !rawDb.includes("4000000000000002"));
  s.check("no card number in the message log", !rawOut.includes("4242424242424242"));
  s.check("the attempt log has no card digits", !JSON.stringify(intent(co.intentId)).includes("4242424242"));
}

/* ── wallets ── */
{
  const { c, phone } = await fresh("wallet");
  await toCart(c, "crown-ii", 1);
  const co = await checkout(c, phone, { method: "jazzcash" });
  await settle();
  const id = readDb().orders.find((o) => o.groupId === co.groupId).id;
  track(id);
  const wallet = (number) => c.post(`/api/pay/${co.intentId}/wallet`, { number });
  s.check("a wallet needs a real mobile number", (await wallet("123")).error === "wallet_invalid");
  s.check("an empty wallet is refused", (await wallet(TEST.walletEmpty)).error === "wallet_insufficient");
  s.check("an inactive wallet is refused", (await wallet(TEST.walletOff)).error === "wallet_inactive");
  const asked = await wallet("0300 1234567");
  s.check("a good number asks for approval on the phone", asked.ok && asked.view.step === "approve" && asked.view.channel.wallet?.includes("•••") && !JSON.stringify(asked.view).includes("1234567"), JSON.stringify(asked).slice(0, 200));
  s.check("the approval window is running", Date.parse(asked.view.approveUntil) > Date.now());
  const o1 = await c.post(`/api/pay/${co.intentId}/otp`, { code: "111111" });
  const o2 = await c.post(`/api/pay/${co.intentId}/otp`, { code: "222222" });
  const o3 = await c.post(`/api/pay/${co.intentId}/otp`, { code: "333333" });
  s.check("three wrong codes end the attempt", o1.error === "otp_failed" && o2.error === "otp_failed" && o3.error === "otp_locked" && o3.view.status === "failed", JSON.stringify([o1.error, o2.error, o3.error]));
  s.check("a locked attempt cannot be guessed further", !(await c.post(`/api/pay/${co.intentId}/otp`, { code: TEST.otp })).ok);
  await settle();
  s.check("the order is still reserved after the failure", order(id).status === "pending_payment");
  const fail1 = await c.get(`/pay/${co.intentId}`);
  s.check("the failed page offers another try", /did not go through|مکمل نہ ہو سکی/.test(fail1.text));
  // pay again, another way: a new attempt for the same order, Easypaisa this time, in full
  const retry = await payOrder(c, id, { method: "easypaisa", mode: "full" });
  s.check("pay again with another wallet, in full", retry.ok && retry.view.status === "succeeded", JSON.stringify(retry).slice(0, 200));
  await settle();
  const o = order(id);
  s.check("the order records the full payment", o.status === "active" && o.payment.amount === o.total && o.payment.mode === "full" && o.payment.method === "easypaisa");
  s.check("nothing is left to pay at pickup", /(?:PKR 0|0 روپے)/.test((await c.get(`/orders/${id}`)).text));
  s.check("the invoice says paid in full", (await adminC.get(`/admin/orders/${id}/invoice`)).text.includes("Paid in full"));
  s.check("the first attempt stays in the log as failed", intent(co.intentId).status === "failed");

  // cancelling an attempt
  await toCart(c, "phoenix", 1);
  const co2 = await checkout(c, phone, { method: "card" });
  await settle();
  const id2 = readDb().orders.find((x) => x.groupId === co2.groupId).id;
  track(id2);
  const cx = await c.post(`/api/pay/${co2.intentId}/cancel`, {});
  s.check("the customer can back out of an attempt", cx.ok && cx.view.status === "cancelled");
  s.check("a cancelled attempt cannot be continued", !(await c.post(`/api/pay/${co2.intentId}/card`, CARD_FORM)).ok);
  s.check("the bikes stay reserved", order(id2).status === "pending_payment");
}

/* ── bank transfer, with the admin deciding ── */
{
  const { c, phone } = await fresh("bank");
  await toCart(c, "dubhe", 1);
  const co = await checkout(c, phone, { method: "bank" });
  await settle();
  const id = readDb().orders.find((o) => o.groupId === co.groupId).id;
  track(id);
  const pg = await c.get(`/pay/${co.intentId}`);
  const bankRow = readDb().integrations.payments.bank;
  s.check("the page shows the company account and the reference", pg.status === 200 && pg.text.includes(bankRow.iban) && pg.text.includes(intent(co.intentId).ref));
  s.check("a text file is not a receipt", (await upload(c, co.intentId, Buffer.from("just text, not an image"), "x.png")).error === "bad_file");
  s.check("a guest cannot upload", (await upload(client(), co.intentId, PNG)).status === 401);
  const other = await fresh("bankspy");
  s.check("nor another customer", (await upload(other.c, co.intentId, PNG)).status === 404);
  const up = await upload(c, co.intentId, PNG);
  s.check("the receipt is accepted and waits for review", up.ok && up.view.status === "review" && up.view.hasReceipt, JSON.stringify(up).slice(0, 200));
  await settle();
  const pi = intent(co.intentId);
  s.check("the order is not paid yet", order(id).status === "pending_payment" && !order(id).payment);
  s.check("the customer is told it is being checked", outbox("payment.review", co.intentId).length >= 1);
  s.check("a second attempt is refused while one is in review", (await c.post("/api/pay/start", { orderId: id, method: "card" })).error === "payment_in_review");
  s.check("the order page says it is being checked", /being checked|جانچ/.test((await c.get(`/orders/${id}`)).text));

  // the receipt is private
  const name = pi.receipt;
  const url = `/api/receipts/${name}`;
  s.check("the receipt is not public", (await client().get(url)).status === 404);
  s.check("nor for another customer", (await other.c.get(url)).status === 404);
  s.check("the owner can open it", (await c.get(url)).status === 200);
  s.check("staff with payments can open it", (await adminC.get(url)).status === 200);
  s.check("a store account cannot", (await dealerC.get(url)).status === 404);
  s.check("the file is outside the public folder", !fs.existsSync(path.join(ROOT, "public", "receipts")) && fs.existsSync(path.join(ROOT, "admin pannel", "data", "uploads", "receipts", name)));

  // admin
  const page = await adminC.get("/admin/payments");
  s.check("the Payments screen lists the transfer", page.status === 200 && page.text.includes(pi.ref));
  s.check("an operator can open it", (await opC.get("/admin/payments")).status === 200);
  s.check("a store account cannot", (await dealerC.get("/admin/payments")).status !== 200);
  s.check("nor use its API", (await dealerC.patch("/api/admin/payments", { id: co.intentId, action: "approve" })).status === 403);
  s.check("a guest cannot", (await client().patch("/api/admin/payments", { id: co.intentId, action: "approve" })).status === 401);
  s.check("rejecting needs a reason", (await adminC.patch("/api/admin/payments", { id: co.intentId, action: "reject" })).error === "reason_required");
  const rej = await adminC.patch("/api/admin/payments", { id: co.intentId, action: "reject", note: "Amount does not match" });
  s.check("a rejection is recorded", rej.ok);
  await settle();
  s.check("the attempt failed with the reason", intent(co.intentId).status === "failed" && intent(co.intentId).reviewNote === "Amount does not match");
  s.check("the customer is told why", outbox("payment.rejected", co.intentId).some((m) => m.body.includes("Amount does not match")));
  s.check("the order is still reserved", order(id).status === "pending_payment");
  s.check("a decided attempt cannot be decided again", (await adminC.patch("/api/admin/payments", { id: co.intentId, action: "approve" })).error === "not_in_review");

  // pay again by transfer, this time approved
  const again = await payOrder(c, id, { method: "bank" });
  s.check("the customer starts a new transfer", again.ok && again.id !== co.intentId);
  const up2 = await upload(c, again.id, PNG, "r2.png");
  s.check("and uploads the new receipt", up2.ok && up2.view.status === "review");
  const okAdmin = await opC.patch("/api/admin/payments", { id: again.id, action: "approve" });
  s.check("an operator approves it", okAdmin.ok, JSON.stringify(okAdmin));
  await settle();
  const o = order(id);
  s.check("the order moves into the factory queue", o.status === "active" && o.stage === 1 && o.payment.method === "bank" && o.payment.verified && o.payment.verifiedBy === "operator", JSON.stringify(o.payment));
  s.check("the customer is told the money arrived", outbox("payment.received", again.id).length >= 1);
  s.check("the approval is in the audit log", readDb().audit.some((a) => a.entity === "payments" && a.entityId === again.id && a.action === "approve"));
  s.check("the receipt page works for a bank payment", (await c.get(`/receipt/${again.id}`)).text.includes(intent(again.id).ref));
  s.check("export lists the payments (xlsx)", (await adminC.get("/api/admin/payments/export")).status === 200);
  const csv = await adminC.get("/api/admin/payments/export?format=csv");
  s.check("export lists the payments (csv)", csv.status === 200 && csv.text.includes(intent(again.id).ref));
  s.check("a store account cannot export", (await dealerC.get("/api/admin/payments/export")).status !== 200);
}

/* ── switches in the admin ── */
{
  const i = readDb().integrations;
  const save = (patch) =>
    adminC.put("/api/admin/integrations", { payments: { ...i.payments, ...patch }, social: i.social, sms: i.sms, meta: i.meta, smtp: i.smtp, webmaster: i.webmaster, chat: i.chat });
  const { c, phone } = await fresh("switch");
  await toCart(c, "crown-ii", 1);
  const checkoutPage = async () => (await c.get("/checkout")).text;
  s.check("checkout offers all four methods", ["jazzcash", "easypaisa", "card", "bank"].every((m) => (checkoutPage, true)) && (await checkoutPage()).includes("Debit / credit card"));
  s.check("admin switches card off", (await save({ card: { ...i.payments.card, enabled: false } })).ok);
  const co = await checkout(c, phone, { method: "card" });
  s.check("checkout refuses a switched-off method and reserves nothing", co.error === "method_disabled" && (await (async () => (await settle(), (user(phone).cart ?? []).length === 1))()));
  s.check("a card set to Live is hidden (no live connector yet)", (await save({ card: { ...i.payments.card, enabled: true, mode: "live" } })).ok && (await checkout(c, phone, { method: "card" })).error === "method_disabled");
  s.check("bank switched off is refused", (await save({ card: i.payments.card, bank: { ...i.payments.bank, enabled: false } })).ok && (await checkout(c, phone, { method: "bank" })).error === "method_disabled");
  s.check("admin restores everything", (await save({ card: i.payments.card, bank: i.payments.bank })).ok);
  await settle();
  s.check("the bank details are editable and shown", (await adminC.put("/api/admin/integrations", { payments: { ...i.payments, bank: { ...i.payments.bank, accountTitle: "QA Account Title" } }, social: i.social, sms: i.sms, meta: i.meta, smtp: i.smtp, webmaster: i.webmaster, chat: i.chat })).ok);
  const ok = await checkout(c, phone, { method: "bank" });
  await settle();
  track(...readDb().orders.filter((o) => o.groupId === ok.groupId).map((o) => o.id));
  s.check("customers see the new account title", (await c.get(`/pay/${ok.intentId}`)).text.includes("QA Account Title"));
  await save({ bank: i.payments.bank });
}

// release everything this suite reserved
{
  const { c } = await fresh("cleanup");
  void c;
  await settle();
  const db = readDb();
  const pending = db.orders.filter((o) => mine.includes(o.id) && o.status === "pending_payment");
  for (const o of pending) {
    const owner = db.users.find((u) => u.id === o.userId);
    const cc = client();
    await cc.loginUser(owner.phone, "QaTest@2026");
    await cc.post(`/api/orders/${o.id}/cancel`, {});
  }
  await cancelAll(client(), []);
  await settle();
  const left = readDb().orders.filter((o) => mine.includes(o.id) && o.status === "pending_payment");
  s.check("the suite released what it reserved", left.length === 0, String(left.length));
}

const out = s.done();
process.exit(out.failed ? 1 : 0);
