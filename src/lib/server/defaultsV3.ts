import { DEFAULT_ROLES } from "../perms";
import type { Banner, Brand, Category, Coupon, Currency, DB, Dealer, L, NavItem, OptionGroup, PageDoc, Post, Template, Zone } from "../types";
import { randomId } from "./crypto";

/** Collections added in database version 3. Used for a fresh install and to upgrade a version 2 file without losing anything. */

const now = () => new Date().toISOString();
const l = (en: string, ur: string): L => ({ en, ur });
const id = () => randomId(6);

const SERIES: { slug: string; name: L; blurb: L }[] = [
  { slug: "scooter", name: l("Electric Scooter", "الیکٹرک اسکوٹر"), blurb: l("Easy city riding", "شہر کے لیے آسان سواری") },
  { slug: "motorcycle", name: l("Electric Motorcycle", "الیکٹرک موٹر سائیکل"), blurb: l("Real highway pace", "ہائی وے کی رفتار") },
  { slug: "tricycle", name: l("Electric Tricycle", "الیکٹرک تین پہیہ"), blurb: l("Cargo and passengers", "مال اور مسافر") },
  { slug: "eec", name: l("EEC Scooter", "ای ای سی اسکوٹر"), blurb: l("Road-legal class", "روڈ لیگل کلاس") },
  { slug: "light", name: l("Light Scooter", "لائٹ اسکوٹر"), blurb: l("Light and nimble", "ہلکی اور تیز") },
  { slug: "bicycle", name: l("Electric Bicycle", "الیکٹرک سائیکل"), blurb: l("Pedal-assisted", "پیڈل کے ساتھ مدد") },
];

export function defaultCategories(): Category[] {
  return SERIES.map((s, i) => ({ id: `cat-${s.slug}`, slug: s.slug, name: s.name, blurb: s.blurb, image: null, bannerTitle: s.name, bannerText: s.blurb, sort: i, enabled: true }));
}

export function defaultBrands(): Brand[] {
  return [
    { id: "brand-evolta", slug: "evolta", name: "Evolta", description: l("Evolta Bikes: electric two- and three-wheelers built by Jiangsu Zhongxiang for Pakistan.", "ایوولٹا بائیکس: جیانگسو ژونگ شیانگ کی بنائی ہوئی پاکستان کے لیے الیکٹرک دو اور تین پہیہ گاڑیاں۔"), logo: null, enabled: true, sort: 0 },
  ];
}

export function defaultBanners(): Banner[] {
  const slide = (slug: string, glow: string, title: string, tagline: L, sort: number): Banner => ({ id: `ban-${slug}`, placement: "home", category: null, model: slug, title: l(title, title), subtitle: tagline, cta: l("Discover more", "مزید جانیں"), href: `/customize/${slug}`, image: null, glow, start: null, end: null, sort, enabled: true });
  return [
    slide("r-xfx", "255,59,59", "R-XFX", l("Full-size electric motorcycle with real highway pace.", "ہائی وے کی رفتار والی مکمل سائز الیکٹرک موٹر سائیکل۔"), 0),
    slide("r-jlong", "96,150,255", "R-JLong", l("Sport-bike looks with a 3000 W motor.", "3000 واٹ موٹر کے ساتھ اسپورٹ بائیک کا انداز۔"), 1),
    slide("retro-cg", "92,207,122", "Retro-CG", l("A classic cafe-racer silhouette, now electric.", "کلاسک کیفے ریسر انداز، اب الیکٹرک۔"), 2),
  ];
}

export function defaultNav(): NavItem[] {
  const item = (menu: NavItem["menu"], key: string | null, en: string, ur: string, href: string, sort: number): NavItem => ({ id: `nav-${menu}-${sort}`, menu, key, label: l(en, ur), href, newTab: false, sort, enabled: true });
  return [
    item("header", "customize", "Vehicle Customize", "گاڑی کی تخصیص", "/customize", 0),
    item("header", "inventory", "Inventory Query", "اسٹاک معلومات", "/inventory", 1),
    item("header", "orders", "My Orders", "میرے آرڈرز", "/orders", 2),
    item("header", "tracking", "Logistics Tracking", "ترسیل کی ٹریکنگ", "/tracking", 3),
    item("header", null, "Blog", "بلاگ", "/blog", 4),
    item("header", null, "Enquiry", "دریافت", "/enquiry", 5),
    item("header", null, "Book a Test Drive", "ٹیسٹ ڈرائیو بک کریں", "/test-drive", 6),
    item("footer", "customize", "Vehicle Customize", "گاڑی کی تخصیص", "/customize", 0),
    item("footer", "inventory", "Inventory Query", "اسٹاک معلومات", "/inventory", 1),
    item("footer", "orders", "My Orders", "میرے آرڈرز", "/orders", 2),
    item("footer", "tracking", "Logistics Tracking", "ترسیل کی ٹریکنگ", "/tracking", 3),
    item("footer", null, "Blog", "بلاگ", "/blog", 4),
    item("footer", null, "Enquiry", "دریافت", "/enquiry", 5),
    item("footer", null, "Return Policy", "واپسی کی پالیسی", "/returns", 6),
    item("footer", null, "Privacy Policy", "رازداری کی پالیسی", "/privacy", 7),
    item("footer", null, "Terms & Conditions", "شرائط و ضوابط", "/terms", 8),
  ];
}

export function defaultPages(): PageDoc[] {
  const page = (slug: string, kind: PageDoc["kind"], title: L, body: L): PageDoc => ({ id: `page-${slug}`, slug, kind, title, body, seo: null, enabled: true, updatedAt: now() });
  return [
    page(
      "about",
      "page",
      l("About Evolta Bikes Zhongxiang", "ایوولٹا بائیکس ژونگ شیانگ کے بارے میں"),
      l(
        "Evolta Bikes Zhongxiang sells electric two- and three-wheelers made by Jiangsu Zhongxiang for riders in Pakistan.\n\nYou design your vehicle online, see the price in rupees at once and lock the order with an advance payment. We then follow it through the factory, the sea freight and Pakistani customs until it arrives at a partner dealership near you.",
        "ایوولٹا بائیکس ژونگ شیانگ، جیانگسو ژونگ شیانگ کی بنائی ہوئی الیکٹرک دو اور تین پہیہ گاڑیاں پاکستان کے سواروں تک پہنچاتی ہے۔\n\nآپ گاڑی آن لائن ترتیب دیتے ہیں، قیمت فوراً روپوں میں دیکھتے ہیں اور ایڈوانس ادائیگی سے آرڈر محفوظ کرتے ہیں۔ پھر ہم اسے فیکٹری، سمندری ترسیل اور پاکستانی کسٹمز سے گزار کر آپ کے قریبی پارٹنر ڈیلر تک پہنچاتے ہیں۔",
      ),
    ),
    page(
      "returns",
      "policy",
      l("Return Policy", "واپسی کی پالیسی"),
      l(
        "## Before you pay the advance\nYou can cancel any order that is still waiting for its advance payment. The reserved unit goes back to stock at once and nothing is charged.\n\n## After the advance\nThe advance locks factory capacity for a vehicle built to your configuration, so it is not refundable once production has started. Before production starts, contact us through the enquiry page and we will review the request.\n\n## On arrival\nCheck the vehicle at the dealership before you take it. If it arrives damaged or does not match your order, tell the dealer and us in writing the same day and we will arrange a repair or replacement under the factory warranty.",
        "## ایڈوانس ادا کرنے سے پہلے\nجس آرڈر کی ایڈوانس ادائیگی باقی ہو اسے آپ منسوخ کر سکتے ہیں۔ محفوظ کی گئی یونٹ فوراً اسٹاک میں واپس چلی جاتی ہے اور کوئی رقم نہیں کٹتی۔\n\n## ایڈوانس کے بعد\nایڈوانس آپ کی ترتیب کے مطابق گاڑی کی فیکٹری گنجائش محفوظ کرتا ہے، اس لیے پیداوار شروع ہونے کے بعد واپس نہیں ہوتا۔ پیداوار سے پہلے دریافت کے صفحے پر رابطہ کریں، ہم درخواست کا جائزہ لیں گے۔\n\n## گاڑی ملنے پر\nگاڑی لینے سے پہلے ڈیلر کے پاس اس کا معائنہ کریں۔ اگر وہ خراب پہنچے یا آرڈر سے مختلف ہو تو اسی دن ڈیلر اور ہمیں تحریری اطلاع دیں، ہم فیکٹری وارنٹی کے تحت مرمت یا تبدیلی کا انتظام کریں گے۔",
      ),
    ),
    page(
      "privacy",
      "policy",
      l("Privacy Policy", "رازداری کی پالیسی"),
      l(
        "## What we keep\nYour name, phone number, city, email (if you give one), the quotations you save and the orders you place.\n\n## Why\nTo prepare quotations, process orders, tell you where your vehicle is and let your dealer contact you for pickup.\n\n## Who sees it\nOur team and the dealership you choose for pickup. We do not sell your details. Payment details are handled by the payment provider, not stored here.\n\n## Your choices\nYou can ask us to correct or delete your account through the enquiry page.",
        "## ہم کیا محفوظ رکھتے ہیں\nآپ کا نام، فون نمبر، شہر، ای میل (اگر دیں)، محفوظ کی گئی کوٹیشنز اور دیے گئے آرڈرز۔\n\n## کیوں\nکوٹیشن بنانے، آرڈر پر عمل کرنے، گاڑی کی جگہ بتانے اور ڈیلر کو وصولی کے لیے رابطے کی اجازت دینے کے لیے۔\n\n## کون دیکھتا ہے\nہماری ٹیم اور آپ کا منتخب کردہ ڈیلر۔ ہم آپ کی تفصیلات فروخت نہیں کرتے۔ ادائیگی کی تفصیلات ادائیگی فراہم کنندہ سنبھالتا ہے، یہاں محفوظ نہیں ہوتیں۔\n\n## آپ کے اختیارات\nآپ دریافت کے صفحے کے ذریعے اپنا اکاؤنٹ درست یا حذف کرنے کی درخواست کر سکتے ہیں۔",
      ),
    ),
    page(
      "terms",
      "policy",
      l("Terms & Conditions", "شرائط و ضوابط"),
      l(
        "## Prices\nPrices are in Pakistani rupees and can change before you place an order. A quotation shows the price at the time it was made.\n\n## Orders\nAn order is confirmed when the advance payment is verified. Unpaid orders are released after the lock period shown at checkout.\n\n## Delivery\nDelivery dates are estimates that depend on production, shipping and customs. We update the tracking page at every step.\n\n## Warranty\nVehicles carry the factory warranty. Service is arranged through the dealership you picked.",
        "## قیمتیں\nقیمتیں پاکستانی روپوں میں ہیں اور آرڈر دینے سے پہلے بدل سکتی ہیں۔ کوٹیشن میں وہ قیمت ہوتی ہے جو اس وقت تھی۔\n\n## آرڈر\nایڈوانس ادائیگی کی تصدیق کے بعد آرڈر پکا ہوتا ہے۔ ادا نہ کیے گئے آرڈر چیک آؤٹ پر دکھائی گئی مدت کے بعد چھوڑ دیے جاتے ہیں۔\n\n## ترسیل\nترسیل کی تاریخیں اندازے ہیں جو پیداوار، شپنگ اور کسٹمز پر منحصر ہیں۔ ہم ہر مرحلے پر ٹریکنگ صفحہ اپ ڈیٹ کرتے ہیں۔\n\n## وارنٹی\nگاڑیوں پر فیکٹری وارنٹی ہے۔ سروس آپ کے منتخب ڈیلر کے ذریعے ہوتی ہے۔",
      ),
    ),
    page(
      "brand",
      "brand",
      l("The Evolta Bikes story", "ایوولٹا بائیکس کی کہانی"),
      l(
        "Evolta Bikes brings Jiangsu Zhongxiang's electric vehicles to Pakistan: scooters for the city, motorcycles for the highway and tricycles for work.\n\nEvery model is built to order, checked at the factory and delivered through a dealership you can visit.",
        "ایوولٹا بائیکس جیانگسو ژونگ شیانگ کی الیکٹرک گاڑیاں پاکستان لاتی ہے: شہر کے لیے اسکوٹر، ہائی وے کے لیے موٹر سائیکلیں اور کام کے لیے تین پہیہ گاڑیاں۔\n\nہر ماڈل آرڈر پر بنتا ہے، فیکٹری میں جانچا جاتا ہے اور ایسے ڈیلر کے ذریعے پہنچتا ہے جہاں آپ جا سکتے ہیں۔",
      ),
    ),
  ];
}

export function defaultPosts(): Post[] {
  const t = now();
  const post = (slug: string, title: L, excerpt: L, body: L, tags: string[]): Post => ({ id: `post-${slug}`, slug, title, excerpt, body, image: null, tags, status: "published", publishAt: null, seo: null, views: 0, createdAt: t, updatedAt: t });
  return [
    post(
      "how-delivery-works",
      l("How your vehicle gets from the factory to your dealer", "آپ کی گاڑی فیکٹری سے ڈیلر تک کیسے پہنچتی ہے"),
      l("Eight clear steps, from advance payment to pickup.", "ایڈوانس سے وصولی تک آٹھ واضح مراحل۔"),
      l(
        "Every order moves through eight steps: advance payment, factory preparation, production and assembly, quality check, international shipping, Pakistani customs, local transport and finally pickup at your dealership.\n\nThe tracking page shows which step you are on and an estimated arrival date that updates as the order moves.",
        "ہر آرڈر آٹھ مراحل سے گزرتا ہے: ایڈوانس ادائیگی، فیکٹری تیاری، پیداوار اور اسمبلی، کوالٹی چیک، بین الاقوامی شپنگ، پاکستانی کسٹمز، مقامی ترسیل اور آخر میں ڈیلر سے وصولی۔\n\nٹریکنگ صفحہ دکھاتا ہے کہ آپ کس مرحلے پر ہیں اور آمد کی متوقع تاریخ آرڈر کے آگے بڑھنے کے ساتھ بدلتی رہتی ہے۔",
      ),
      ["delivery", "guide"],
    ),
    post(
      "scooter-or-motorcycle",
      l("Scooter or motorcycle: which one fits you?", "اسکوٹر یا موٹر سائیکل: آپ کے لیے کون سی بہتر؟"),
      l("A quick way to choose by range, speed and daily use.", "رینج، رفتار اور روزمرہ استعمال کے حساب سے فوری انتخاب۔"),
      l(
        "Scooters are light, easy to park and ideal for short city trips. Motorcycles carry more power and range, which suits longer daily rides and highway stretches.\n\nUse the comparison section on the home page to put three models side by side before you customise one.",
        "اسکوٹر ہلکے ہوتے ہیں، پارک کرنا آسان ہوتا ہے اور شہر کے مختصر سفر کے لیے بہترین ہیں۔ موٹر سائیکلوں میں زیادہ طاقت اور رینج ہوتی ہے جو طویل روزانہ سفر اور ہائی وے کے لیے موزوں ہے۔\n\nکسی ماڈل کو ترتیب دینے سے پہلے ہوم پیج کا موازنہ سیکشن استعمال کریں اور تین ماڈلز ساتھ ساتھ دیکھیں۔",
      ),
      ["guide", "models"],
    ),
  ];
}

export function defaultCoupons(): Coupon[] {
  return [{ id: "cp-welcome", code: "WELCOME5", type: "percent", value: 5, minTotal: 100000, maxDiscount: 25000, models: [], start: null, end: null, usageLimit: 0, perUser: 1, used: 0, enabled: true }];
}

/** Starting rates against 1 PKR. The admin sets the real ones. */
export function defaultCurrencies(): Currency[] {
  return [
    { code: "PKR", name: "Pakistani rupee", symbol: "PKR", rate: 1, decimals: 0, enabled: true, base: true },
    { code: "USD", name: "US dollar", symbol: "$", rate: 0.0036, decimals: 2, enabled: true, base: false },
    { code: "CNY", name: "Chinese yuan", symbol: "¥", rate: 0.026, decimals: 2, enabled: true, base: false },
    { code: "AED", name: "UAE dirham", symbol: "AED", rate: 0.0132, decimals: 2, enabled: true, base: false },
    { code: "EUR", name: "Euro", symbol: "€", rate: 0.0033, decimals: 2, enabled: false, base: false },
  ];
}

export function defaultZones(): Zone[] {
  return [
    { id: "zone-sindh", name: l("Sindh (port side)", "سندھ (بندرگاہ کے قریب)"), cities: ["karachi", "hyderabad"], baseCost: 8000, extraDays: 0, enabled: true },
    { id: "zone-punjab", name: l("Punjab", "پنجاب"), cities: ["lahore", "faisalabad", "multan", "sialkot", "rawalpindi"], baseCost: 14000, extraDays: 2, enabled: true },
    { id: "zone-capital-kpk", name: l("Islamabad & Khyber Pakhtunkhwa", "اسلام آباد اور خیبر پختونخوا"), cities: ["islamabad", "peshawar"], baseCost: 16000, extraDays: 3, enabled: true },
    { id: "zone-balochistan", name: l("Balochistan", "بلوچستان"), cities: ["quetta"], baseCost: 22000, extraDays: 5, enabled: true },
  ];
}

export function defaultTemplates(): Template[] {
  const tpl = (event: string, channel: Template["channel"], subject: L, body: L): Template => ({ id: `tpl-${event}-${channel}`, event, channel, subject, body, enabled: true });
  return [
    tpl("order.created", "email", l("Order {order} received", "آرڈر {order} موصول ہوا"), l("Hello {name}, we reserved your {model}. Pay the advance of {deposit} before {lockUntil} to lock the order.", "{name} صاحب/صاحبہ، ہم نے آپ کی {model} محفوظ کر لی ہے۔ آرڈر پکا کرنے کے لیے {lockUntil} سے پہلے {deposit} ایڈوانس ادا کریں۔")),
    tpl("order.created", "sms", l("", ""), l("Evolta: order {order} reserved. Pay {deposit} before {lockUntil}.", "ایوولٹا: آرڈر {order} محفوظ۔ {lockUntil} سے پہلے {deposit} ادا کریں۔")),
    tpl("payment.verified", "email", l("Advance confirmed for {order}", "{order} کا ایڈوانس تصدیق شدہ"), l("Hello {name}, we confirmed your advance of {deposit}. Your {model} is now in the factory queue.", "{name} صاحب/صاحبہ، آپ کا {deposit} ایڈوانس تصدیق ہو گیا۔ آپ کی {model} اب فیکٹری قطار میں ہے۔")),
    tpl("payment.verified", "sms", l("", ""), l("Evolta: advance for {order} confirmed. Track it on the site.", "ایوولٹا: {order} کا ایڈوانس تصدیق شدہ۔ سائٹ پر ٹریک کریں۔")),
    tpl("stage.changed", "email", l("{order}: {stage}", "{order}: {stage}"), l("Hello {name}, your {model} reached the step \"{stage}\". Estimated arrival: {eta}.", "{name} صاحب/صاحبہ، آپ کی {model} مرحلہ \"{stage}\" پر پہنچ گئی۔ متوقع آمد: {eta}۔")),
    tpl("stage.changed", "sms", l("", ""), l("Evolta: {order} is now \"{stage}\". ETA {eta}.", "ایوولٹا: {order} اب \"{stage}\" پر ہے۔ متوقع آمد {eta}۔")),
    tpl("order.cancelled", "email", l("Order {order} cancelled", "آرڈر {order} منسوخ"), l("Hello {name}, order {order} was cancelled and the reserved unit released.", "{name} صاحب/صاحبہ، آرڈر {order} منسوخ ہو گیا اور محفوظ یونٹ چھوڑ دی گئی۔")),
    tpl("order.expired", "email", l("Order {order} expired", "آرڈر {order} کی مدت ختم"), l("Hello {name}, the advance for {order} was not received in time, so the unit was released. You can configure it again any time.", "{name} صاحب/صاحبہ، {order} کا ایڈوانس وقت پر نہیں ملا اس لیے یونٹ چھوڑ دی گئی۔ آپ کسی بھی وقت دوبارہ ترتیب دے سکتے ہیں۔")),
    tpl("pickup.chosen", "email", l("Pickup store confirmed for {order}", "{order} کے لیے وصولی اسٹور مقرر"), l("Hello {name}, you will collect your {model} from {store}. We will tell you when it arrives.", "{name} صاحب/صاحبہ، آپ اپنی {model} {store} سے وصول کریں گے۔ پہنچنے پر ہم اطلاع دیں گے۔")),
    tpl("pickup.chosen", "sms", l("", ""), l("Evolta: pickup store for {order} is {store}.", "ایوولٹا: {order} کی وصولی کا اسٹور {store} ہے۔")),
    tpl("testdrive.requested", "email", l("Test drive requested: {model}", "ٹیسٹ ڈرائیو کی درخواست: {model}"), l("Hello {name}, we received your test drive request for the {model} at {store} on {when}. The store will confirm shortly.", "{name} صاحب/صاحبہ، ہمیں {store} پر {when} کو {model} کی ٹیسٹ ڈرائیو کی درخواست مل گئی۔ اسٹور جلد تصدیق کرے گا۔")),
    tpl("testdrive.requested", "sms", l("", ""), l("Evolta: test drive requested, {model}, {store}, {when}. We will confirm soon.", "ایوولٹا: ٹیسٹ ڈرائیو کی درخواست، {model}، {store}، {when}۔ جلد تصدیق ہو گی۔")),
    tpl("testdrive.cancelled", "sms", l("", ""), l("Evolta: your test drive on {when} at {store} was cancelled.", "ایوولٹا: {store} پر {when} کی ٹیسٹ ڈرائیو منسوخ ہو گئی۔")),
    tpl("partner.received", "sms", l("", ""), l("Evolta: we received your {type} application, ref {ref}.", "ایوولٹا: ہمیں آپ کی {type} درخواست مل گئی، حوالہ {ref}۔")),
    tpl("enquiry.received", "sms", l("", ""), l("Evolta: we received your enquiry, ref {ref}.", "ایوولٹا: ہمیں آپ کی دریافت مل گئی، حوالہ {ref}۔")),
    tpl("testdrive.confirmed", "email", l("Test drive confirmed: {model}", "ٹیسٹ ڈرائیو کی تصدیق: {model}"), l("Hello {name}, your test drive of the {model} is confirmed: {store}, {when}. Please bring your ID and licence.", "{name} صاحب/صاحبہ، آپ کی {model} کی ٹیسٹ ڈرائیو کی تصدیق ہو گئی: {store}، {when}۔ شناختی کارڈ اور لائسنس ساتھ لائیں۔")),
    tpl("testdrive.confirmed", "sms", l("", ""), l("Evolta: test drive confirmed, {store}, {when}.", "ایوولٹا: ٹیسٹ ڈرائیو کی تصدیق، {store}، {when}۔")),
    tpl("testdrive.cancelled", "email", l("Test drive cancelled", "ٹیسٹ ڈرائیو منسوخ"), l("Hello {name}, your test drive on {when} at {store} was cancelled. You can book another time on the site.", "{name} صاحب/صاحبہ، {store} پر {when} کی ٹیسٹ ڈرائیو منسوخ ہو گئی۔ آپ سائٹ پر نیا وقت بک کر سکتے ہیں۔")),
    tpl("partner.received", "email", l("We received your partner application", "ہمیں آپ کی شراکت کی درخواست مل گئی"), l("Hello {name}, thank you for applying to become our {type}. Reference {ref}. Our team will contact you soon.", "{name} صاحب/صاحبہ، ہمارا {type} بننے کے لیے درخواست کا شکریہ۔ حوالہ {ref}۔ ہماری ٹیم جلد رابطہ کرے گی۔")),
    tpl("partner.approved", "email", l("Your partner application is approved", "آپ کی شراکت کی درخواست منظور"), l("Hello {name}, congratulations! Your {type} application ({ref}) is approved. We will contact you with the next steps.", "{name} صاحب/صاحبہ، مبارک ہو! آپ کی {type} درخواست ({ref}) منظور ہو گئی۔ اگلے مراحل کے لیے ہم رابطہ کریں گے۔")),
    tpl("enquiry.received", "email", l("We received your enquiry", "ہمیں آپ کی دریافت مل گئی"), l("Hello {name}, thank you for writing to us. Reference {ref}. We will reply shortly.", "{name} صاحب/صاحبہ، رابطے کا شکریہ۔ حوالہ {ref}۔ ہم جلد جواب دیں گے۔")),
    tpl("enquiry.reply", "email", l("Reply to your enquiry {ref}", "آپ کی دریافت {ref} کا جواب"), l("{reply}", "{reply}")),
  ];
}

/** The solar add-on. Prices and extra range are placeholders the team edits in Options. */
export function solarGroup(): OptionGroup {
  return {
    key: "solar",
    kind: "choice",
    label: l("Solar Panel", "سولر پینل"),
    hint: l("Charge on the go and add range. Fitted at the factory.", "چلتے ہوئے چارج کریں اور رینج بڑھائیں۔ فیکٹری میں نصب۔"),
    enabled: true,
    items: [
      { id: "none", label: l("No solar panel", "سولر پینل نہیں"), price: 0, rangeKm: 0, enabled: true },
      { id: "s100", label: l("100 W panel", "100 واٹ پینل"), price: 25000, rangeKm: 8, enabled: true },
      { id: "s200", label: l("200 W panel", "200 واٹ پینل"), price: 45000, rangeKm: 15, enabled: true },
      { id: "s300", label: l("300 W panel", "300 واٹ پینل"), price: 65000, rangeKm: 22, enabled: true },
    ],
  };
}

export const defaultSocial = () => ({ tiktok: "https://www.tiktok.com/@evoltabikes", facebook: "https://www.facebook.com/evoltabikes", instagram: "https://www.instagram.com/evoltabikes", youtube: "" });

export const defaultCompany = (): NonNullable<DB["settings"]["company"]> => ({
  name: "Evolta Bikes Zhongxiang",
  email: "info@evoltabikes.pk",
  supportEmail: "support@evoltabikes.pk",
  phone: "+92 21 3456 1200",
  whatsapp: "923001234567",
  address: l("Plot 12, Shahrah-e-Faisal, PECHS, Karachi, Pakistan", "پلاٹ 12، شاہراہِ فیصل، پی ای سی ایچ ایس، کراچی، پاکستان"),
  hours: l("Mon – Sat, 10:00 – 18:00", "پیر تا ہفتہ، صبح 10 تا شام 6"),
  map: null,
});

export const defaultTestDrive = (): NonNullable<Dealer["testDrive"]> => ({ enabled: true, models: [], days: [1, 2, 3, 4, 5, 6], from: "10:00", to: "17:00", slotMinutes: 60, capacity: 2 });

export function defaultIntegrations(): DB["integrations"] {
  return {
    payments: {
      jazzcash: { enabled: true, mode: "sandbox", merchantId: "", secret: "" },
      easypaisa: { enabled: true, mode: "sandbox", merchantId: "", secret: "" },
    },
    social: { google: { enabled: false, clientId: "", secret: "" }, facebook: { enabled: false, clientId: "", secret: "" } },
    sms: { enabled: false, provider: "", sender: "EVOLTA", apiKey: "" },
    meta: { pixelId: "", whatsapp: "", capiToken: "" },
    smtp: { enabled: false, host: "", port: 587, user: "", pass: "", from: "Evolta Bikes <no-reply@evoltabikes.pk>" },
    webmaster: { googleVerification: "", bingVerification: "", analyticsId: "" },
    chat: { enabled: true, welcome: l("Hi! Ask us anything about our bikes, prices or delivery.", "السلام علیکم! ہماری بائیکس، قیمتوں یا ترسیل کے بارے میں کچھ بھی پوچھیں۔") },
  };
}

/** Everything version 3 adds, ready to spread into a DB object. */
export function v3Collections(): Pick<DB, "roles" | "banners" | "pages" | "navItems" | "posts" | "brands" | "categories" | "coupons" | "currencies" | "zones" | "reviews" | "enquiries" | "chats" | "testDrives" | "partners" | "templates" | "outbox" | "audit" | "integrations"> {
  return {
    roles: structuredClone(DEFAULT_ROLES),
    banners: defaultBanners(),
    pages: defaultPages(),
    navItems: defaultNav(),
    posts: defaultPosts(),
    brands: defaultBrands(),
    categories: defaultCategories(),
    coupons: defaultCoupons(),
    currencies: defaultCurrencies(),
    zones: defaultZones(),
    reviews: [],
    enquiries: [],
    chats: [],
    testDrives: [],
    partners: [],
    templates: defaultTemplates(),
    outbox: [],
    audit: [],
    integrations: defaultIntegrations(),
  };
}

export { id as newId };
