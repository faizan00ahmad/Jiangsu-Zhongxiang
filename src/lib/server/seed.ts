import crypto from "node:crypto";
import { STAGES, daysRemaining } from "../catalog";
import { depositFor, priceQuote } from "../pricing";
import { DB_VERSION, type Admin, type CityKey, type Config, type DB, type Dealer, type Model, type OptionGroup, type Order, type Quote, type User } from "../types";
import { importCatalog } from "./catalogImport";
import { code, hashPassword, randomId } from "./crypto";

/** First-run data. Models come from the ZXTec factory catalogue; prices and stock are placeholders the team edits
 *  in the admin panel. Demo logins are listed in README.md. */

const MODELS: Model[] = importCatalog();
const LISTED = MODELS.filter((m) => m.enabled);

const yesNo = (price: number, no: [string, string], yes: [string, string]) => [
  { id: "no", label: { en: no[0], ur: no[1] }, price: 0, enabled: true },
  { id: "yes", label: { en: yes[0], ur: yes[1] }, price, enabled: true },
];

const OPTIONS: OptionGroup[] = [
  {
    key: "color",
    kind: "color",
    label: { en: "Body Color", ur: "باڈی کا رنگ" },
    hint: { en: "The preview repaints instantly.", ur: "پیش منظر فوراً نئے رنگ میں دکھایا جاتا ہے۔" },
    enabled: true,
    items: [
      { id: "pearl", label: { en: "Pearl White", ur: "پرل وائٹ" }, hex: "#eceef0", price: 0, enabled: true },
      { id: "midnight", label: { en: "Midnight Black", ur: "مڈنائٹ بلیک" }, hex: "#1a1c22", price: 0, enabled: true },
      { id: "graphite", label: { en: "Graphite Grey", ur: "گریفائٹ گرے" }, hex: "#6a707b", price: 0, enabled: true },
      { id: "ocean", label: { en: "Ocean Blue", ur: "اوشن بلیو" }, hex: "#1e6ad6", price: 3000, enabled: true },
      { id: "volt", label: { en: "Volt Mint", ur: "وولٹ منٹ" }, hex: "#1fc996", price: 3000, enabled: true },
      { id: "sun", label: { en: "Sunburst Yellow", ur: "سن برسٹ ییلو" }, hex: "#f2b705", price: 3000, enabled: true },
      { id: "red", label: { en: "Racing Red", ur: "ریسنگ ریڈ" }, hex: "#d42230", price: 5000, enabled: true },
      { id: "emerald", label: { en: "Emerald Green", ur: "ایمرلڈ گرین" }, hex: "#0c7a43", price: 5000, enabled: true },
    ],
  },
  {
    key: "wheel",
    kind: "wheel",
    label: { en: "Wheel Style", ur: "وہیل کا اسٹائل" },
    hint: { en: "Custom rims to match your style.", ur: "اپنے انداز کے مطابق رِم منتخب کریں۔" },
    enabled: true,
    items: [
      { id: "five", label: { en: "Five-Spoke", ur: "فائیو اسپوک" }, price: 0, enabled: true },
      { id: "aero", label: { en: "Aero Disc", ur: "ایرو ڈسک" }, price: 4500, enabled: true },
      { id: "twin", label: { en: "Twin Y-Spoke", ur: "ٹوئن وائی اسپوک" }, price: 6500, enabled: true },
      { id: "ten", label: { en: "Ten-Spoke Sport", ur: "ٹین اسپوک اسپورٹ" }, price: 7500, enabled: true },
      { id: "turbine", label: { en: "Turbine", ur: "ٹربائن" }, price: 9000, enabled: true },
    ],
  },
  {
    key: "gps",
    kind: "toggle",
    label: { en: "GPS Positioning", ur: "جی پی ایس لوکیشن" },
    hint: { en: "Live location and anti-theft tracking.", ur: "لائیو لوکیشن اور چوری سے بچاؤ کی ٹریکنگ۔" },
    enabled: true,
    items: yesNo(14500, ["Disable", "بند"], ["Enable", "فعال"]),
  },
  {
    key: "battery",
    kind: "choice",
    label: { en: "Lithium Battery Capacity", ur: "لیتھیم بیٹری کی گنجائش" },
    hint: { en: "A bigger pack means a longer range.", ur: "بڑی بیٹری، زیادہ فاصلہ۔" },
    enabled: true,
    items: [
      { id: "small", label: { en: "Small", ur: "چھوٹی" }, price: 0, rangeFactor: 1, enabled: true },
      { id: "medium", label: { en: "Medium", ur: "درمیانی" }, price: 42000, rangeFactor: 1.35, enabled: true },
      { id: "large", label: { en: "Large", ur: "بڑی" }, price: 88000, rangeFactor: 1.75, enabled: true },
    ],
  },
  {
    key: "display",
    kind: "choice",
    label: { en: "Display Type", ur: "ڈسپلے کی قسم" },
    hint: { en: "Choose your instrument cluster.", ur: "اپنا میٹر/ڈسپلے منتخب کریں۔" },
    enabled: true,
    items: [
      { id: "analog", label: { en: "Analog Meter", ur: "اینالاگ میٹر" }, price: 0, enabled: true },
      { id: "led", label: { en: "LED Screen", ur: "ایل ای ڈی اسکرین" }, price: 6500, enabled: true },
      { id: "lcd", label: { en: "LCD Screen", ur: "ایل سی ڈی اسکرین" }, price: 11000, enabled: true },
    ],
  },
  {
    key: "cruise",
    kind: "toggle",
    label: { en: "Cruise Control", ur: "کروز کنٹرول" },
    hint: { en: "Relaxed long-distance commuting.", ur: "لمبے سفر میں آرام دہ ڈرائیونگ۔" },
    enabled: true,
    items: yesNo(16000, ["Not Install", "نصب نہ کریں"], ["Install", "نصب کریں"]),
  },
  {
    key: "reverse",
    kind: "toggle",
    label: { en: "Reverse Function", ur: "ریورس فنکشن" },
    hint: { en: "Safer manoeuvring — ideal for three-wheelers.", ur: "محفوظ موڑ کاٹنا — تین پہیہ گاڑیوں کے لیے بہترین۔" },
    enabled: true,
    items: yesNo(7500, ["No", "نہیں"], ["Yes", "ہاں"]),
  },
  {
    key: "standCut",
    kind: "toggle",
    label: { en: "Side Stand Power-Off", ur: "سائیڈ اسٹینڈ پاور آف" },
    hint: { en: "Cuts power when parked to prevent accidental start.", ur: "کھڑی گاڑی کی بجلی بند تاکہ غلطی سے اسٹارٹ نہ ہو۔" },
    enabled: true,
    items: yesNo(3500, ["No", "نہیں"], ["Yes", "ہاں"]),
  },
  {
    key: "speaker",
    kind: "toggle",
    label: { en: "Bluetooth Speaker", ur: "بلوٹوتھ اسپیکر" },
    hint: { en: "Music and calls on the move.", ur: "سفر کے دوران موسیقی اور کالز۔" },
    enabled: true,
    items: yesNo(8500, ["Not Install", "نصب نہ کریں"], ["Install", "نصب کریں"]),
  },
];

// listed models get varied stock (incl. low and out) so every status is visible; the rest start at 20
const LISTED_STOCK = [42, 18, 3, 12, 0, 25, 4, 9, 30, 6];
const FACTORY: Record<string, number> = Object.fromEntries(MODELS.map((m) => [m.slug, m.enabled ? (LISTED_STOCK[LISTED.indexOf(m)] ?? 10) : 20]));

const dealer = (id: string, city: CityKey, area: [string, string], address: [string, string], phone: string, stock: number[]): Dealer => ({
  id,
  city,
  name: { en: `ZX Partner Store — ${area[0]}`, ur: `زیڈ ایکس پارٹنر اسٹور — ${area[1]}` },
  address: { en: address[0], ur: address[1] },
  phone,
  stock: Object.fromEntries(MODELS.map((m) => [m.slug, m.enabled ? (stock[LISTED.indexOf(m)] ?? 0) : 0])),
  enabled: true,
});

const DEALERS: Dealer[] = [
  dealer("dl-khi-1", "karachi", ["Shahrah-e-Faisal", "شاہراہِ فیصل"], ["Plot 12, Shahrah-e-Faisal, PECHS, Karachi", "پلاٹ 12، شاہراہِ فیصل، پی ای سی ایچ ایس، کراچی"], "+92 21 3456 1200", [6, 3, 2, 1, 0, 2, 1, 0, 4, 1]),
  dealer("dl-khi-2", "karachi", ["Korangi Industrial", "کورنگی انڈسٹریل"], ["Sector 23, Korangi Industrial Area, Karachi", "سیکٹر 23، کورنگی انڈسٹریل ایریا، کراچی"], "+92 21 3507 8800", [2, 0, 1, 0, 0, 5, 2, 3, 3, 2]),
  dealer("dl-lhr-1", "lahore", ["Gulberg", "گلبرگ"], ["88-B Main Boulevard, Gulberg III, Lahore", "88-بی مین بلیوارڈ، گلبرگ III، لاہور"], "+92 42 3578 2200", [5, 4, 0, 2, 1, 1, 0, 1, 2, 1]),
  dealer("dl-lhr-2", "lahore", ["Johar Town", "جوہر ٹاؤن"], ["Block G, Johar Town, Lahore", "بلاک جی، جوہر ٹاؤن، لاہور"], "+92 42 3529 4410", [3, 1, 2, 0, 0, 2, 1, 2, 5, 0]),
  dealer("dl-isb-1", "islamabad", ["Blue Area", "بلیو ایریا"], ["Jinnah Avenue, Blue Area, Islamabad", "جناح ایونیو، بلیو ایریا، اسلام آباد"], "+92 51 2870 3300", [4, 2, 1, 3, 1, 0, 0, 0, 1, 1]),
  dealer("dl-rwp-1", "rawalpindi", ["Saddar", "صدر"], ["Bank Road, Saddar, Rawalpindi", "بینک روڈ، صدر، راولپنڈی"], "+92 51 5568 1900", [2, 1, 1, 0, 0, 1, 0, 1, 3, 0]),
  dealer("dl-fsd-1", "faisalabad", ["D Ground", "ڈی گراؤنڈ"], ["Kohinoor Road, D Ground, Faisalabad", "کوہِ نور روڈ، ڈی گراؤنڈ، فیصل آباد"], "+92 41 8712 5500", [3, 0, 2, 0, 0, 3, 1, 2, 2, 0]),
  dealer("dl-mux-1", "multan", ["Bosan Road", "بوسن روڈ"], ["Bosan Road, Gulgasht Colony, Multan", "بوسن روڈ، گلگشت کالونی، ملتان"], "+92 61 6512 7700", [2, 1, 1, 1, 0, 2, 0, 2, 4, 1]),
  dealer("dl-pew-1", "peshawar", ["University Road", "یونیورسٹی روڈ"], ["University Road, Peshawar", "یونیورسٹی روڈ، پشاور"], "+92 91 5841 6600", [1, 1, 0, 0, 0, 1, 1, 1, 2, 0]),
  dealer("dl-uet-1", "quetta", ["Jinnah Road", "جناح روڈ"], ["Jinnah Road, Quetta", "جناح روڈ، کوئٹہ"], "+92 81 2823 4400", [1, 0, 1, 0, 0, 1, 0, 1, 1, 0]),
];

const daysAgo = (d: number, h = 0) => new Date(Date.now() - d * 86400000 - h * 3600000).toISOString();
const addDays = (iso: string, d: number) => new Date(new Date(iso).getTime() + d * 86400000).toISOString();

function demoOrder(user: User, slug: string, cfg: Config, stage: number, ageDays: number, dealerId: string, settings: DB["settings"]): { order: Order; quote: Quote } {
  const model = MODELS.find((m) => m.slug === slug)!;
  const p = priceQuote(model, OPTIONS, cfg);
  const created = daysAgo(ageDays, 3);
  const quote: Quote = { id: randomId(9), userId: user.id, model: slug, modelName: model.name, basePrice: model.basePrice, config: p.config, lines: p.lines, total: p.total, range: p.range, label: null, createdAt: created };
  const times: (string | null)[] = STAGES.map(() => null);
  times[0] = created;
  let t = addDays(created, 1);
  for (let s = 1; s <= stage; s++) {
    times[s] = t;
    t = addDays(t, STAGES[s].days);
  }
  const deposit = depositFor(p.total, settings.depositPercent);
  const paid = stage >= 1;
  const order: Order = {
    id: `ZX-PK-${code(6)}`,
    userId: user.id,
    quoteId: quote.id,
    model: slug,
    modelName: model.name,
    config: p.config,
    lines: p.lines,
    basePrice: model.basePrice,
    total: p.total,
    depositPercent: settings.depositPercent,
    deposit,
    contact: { name: user.name, phone: user.phone, city: DEALERS.find((d) => d.id === dealerId)!.city, dealerId },
    status: paid ? "active" : "pending_payment",
    stage,
    stageTimes: times,
    eta: paid ? addDays(times[stage]!, daysRemaining(stage)) : null,
    trackingNo: stage >= 4 ? `COSU${crypto.randomInt(10000000, 99999999)}` : null,
    carrier: stage >= 4 ? "COSCO Shipping · Shanghai → Karachi" : null,
    payment: paid ? { method: "bank", ref: `PAY-${code(8)}`, amount: deposit, paidAt: times[1]!, verified: true, verifiedAt: times[1]!, verifiedBy: "admin" } : null,
    createdAt: created,
    lockExpiresAt: addDays(created, settings.lockHours / 24),
    history: [{ at: created, by: "customer", action: "order.created" }],
  };
  return { order, quote };
}

export function buildSeed(): DB {
  const settings: DB["settings"] = {
    depositPercent: 20,
    lockHours: 72,
    maxOpenOrders: 2,
    lowStock: 5,
    heroTitle: { en: "Electric. Built for Pakistan.", ur: "الیکٹرک۔ پاکستان کے لیے تیار۔" },
    heroText: { en: "Configure your EV online, see your price in PKR instantly, and track it from our factory to your local dealer.", ur: "اپنی الیکٹرک گاڑی آن لائن ترتیب دیں، قیمت فوراً روپے میں دیکھیں، اور فیکٹری سے مقامی ڈیلر تک اس کی ترسیل ٹریک کریں۔" },
  };
  const now = new Date().toISOString();
  const admin = (username: string, name: string, role: Admin["role"], pw: string, dealerId: string | null = null): Admin => ({ id: randomId(8), username, name, role, dealerId, passwordHash: hashPassword(pw), createdAt: now, disabled: false });
  const demo: User = { id: randomId(8), name: "Ahmed Raza", phone: "03001234567", email: "ahmed@example.com", city: "lahore", passwordHash: hashPassword("Demo@2026"), createdAt: daysAgo(70), disabled: false };

  // the 30-day pickup order is stage 7; the others are mid-journey so every tracking node can be seen
  const seeded = [
    demoOrder(demo, "zx-x-cool", { color: "c1", wheel: "ten", gps: "yes", battery: "large", display: "lcd", cruise: "no", reverse: "yes", standCut: "yes", speaker: "yes" }, 7, 58, "dl-lhr-1", settings),
    demoOrder(demo, "r-jlong", { color: "red", wheel: "turbine", gps: "yes", battery: "medium", display: "lcd", cruise: "yes", reverse: "no", standCut: "yes", speaker: "no" }, 4, 30, "dl-lhr-1", settings),
    demoOrder(demo, "zx-jl", { color: "c1", wheel: "five", gps: "yes", battery: "large", display: "led", cruise: "no", reverse: "yes", standCut: "no", speaker: "no" }, 2, 12, "dl-lhr-2", settings),
    demoOrder(demo, "alkaid", { color: "c2", wheel: "twin", gps: "no", battery: "medium", display: "led", cruise: "no", reverse: "no", standCut: "yes", speaker: "yes" }, 0, 0, "dl-lhr-1", settings),
  ];

  return {
    version: DB_VERSION,
    secret: crypto.randomBytes(32).toString("base64url"),
    settings,
    models: MODELS,
    options: OPTIONS,
    factoryStock: FACTORY,
    dealers: DEALERS,
    users: [demo],
    admins: [
      admin("admin", "超级管理员", "super", "Admin@2026"),
      admin("operator", "国内运营", "operator", "Operator@2026"),
      admin("dealer.lahore", "Gulberg Lahore Store", "dealer", "Dealer@2026", "dl-lhr-1"),
    ],
    quotes: seeded.map((s) => s.quote),
    orders: seeded.map((s) => s.order),
  };
}
