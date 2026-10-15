import type { CityKey, L, StockStatus, VehicleKind } from "./types";

/** Static reference data shared by the site and the admin panel. */

export const KIND_META: Record<VehicleKind, { wheels: 2 | 3; accent: string; glow: string; label: L; zh: string }> = {
  commuter: { wheels: 2, accent: "#2ee6a6", glow: "46,230,166", label: { en: "2-Wheel · Commuter", ur: "دو پہیہ · روزمرہ سفر" }, zh: "两轮代步" },
  sport: { wheels: 2, accent: "#ff4d3d", glow: "255,77,61", label: { en: "2-Wheel · Sport", ur: "دو پہیہ · اسپورٹ" }, zh: "两轮运动" },
  cargo: { wheels: 3, accent: "#f5b40c", glow: "245,180,12", label: { en: "3-Wheel · Cargo", ur: "تین پہیہ · مال بردار" }, zh: "三轮货运" },
  passenger: { wheels: 3, accent: "#3d8bff", glow: "61,139,255", label: { en: "3-Wheel · Passenger", ur: "تین پہیہ · مسافر" }, zh: "三轮载人" },
};
export const KIND_ORDER: VehicleKind[] = ["commuter", "sport", "cargo", "passenger"];

export const CITIES: Record<CityKey, { en: string; ur: string; zh: string; region: L & { zh: string } }> = {
  karachi: { en: "Karachi", ur: "کراچی", zh: "卡拉奇", region: { en: "Sindh", ur: "سندھ", zh: "信德省" } },
  hyderabad: { en: "Hyderabad", ur: "حیدرآباد", zh: "海得拉巴", region: { en: "Sindh", ur: "سندھ", zh: "信德省" } },
  lahore: { en: "Lahore", ur: "لاہور", zh: "拉合尔", region: { en: "Punjab", ur: "پنجاب", zh: "旁遮普省" } },
  faisalabad: { en: "Faisalabad", ur: "فیصل آباد", zh: "费萨拉巴德", region: { en: "Punjab", ur: "پنجاب", zh: "旁遮普省" } },
  multan: { en: "Multan", ur: "ملتان", zh: "木尔坦", region: { en: "Punjab", ur: "پنجاب", zh: "旁遮普省" } },
  rawalpindi: { en: "Rawalpindi", ur: "راولپنڈی", zh: "拉瓦尔品第", region: { en: "Punjab", ur: "پنجاب", zh: "旁遮普省" } },
  sialkot: { en: "Sialkot", ur: "سیالکوٹ", zh: "锡亚尔科特", region: { en: "Punjab", ur: "پنجاب", zh: "旁遮普省" } },
  islamabad: { en: "Islamabad", ur: "اسلام آباد", zh: "伊斯兰堡", region: { en: "Islamabad Capital Territory", ur: "اسلام آباد وفاقی علاقہ", zh: "伊斯兰堡首都区" } },
  peshawar: { en: "Peshawar", ur: "پشاور", zh: "白沙瓦", region: { en: "Khyber Pakhtunkhwa", ur: "خیبر پختونخوا", zh: "开伯尔-普赫图赫瓦省" } },
  quetta: { en: "Quetta", ur: "کوئٹہ", zh: "奎达", region: { en: "Balochistan", ur: "بلوچستان", zh: "俾路支省" } },
};
export const CITY_ORDER: CityKey[] = ["karachi", "lahore", "islamabad", "rawalpindi", "faisalabad", "multan", "peshawar", "quetta", "hyderabad", "sialkot"];
export const isCity = (v: unknown): v is CityKey => typeof v === "string" && v in CITIES;

/** The eight cross-border nodes from the requirement document, in order. `days` drives the ETA estimate. */
export const STAGES: { key: string; days: number; title: L & { zh: string }; detail: L & { zh: string } }[] = [
  {
    key: "payment",
    days: 0,
    title: { en: "Pending Advance Payment", ur: "ایڈوانس ادائیگی زیرِ التوا", zh: "预付款待支付" },
    detail: { en: "Pay the deposit to lock your order and factory capacity.", ur: "آرڈر اور فیکٹری کی پیداواری گنجائش محفوظ کرنے کے لیے ایڈوانس ادا کریں۔", zh: "支付预付款以锁定订单与工厂产能" },
  },
  {
    key: "factory",
    days: 7,
    title: { en: "Factory Preparation Stage", ur: "فیکٹری تیاری کا مرحلہ", zh: "工厂备货" },
    detail: { en: "Factory stocking, parts procurement and export documentation filing.", ur: "فیکٹری اسٹاک، پرزہ جات کی خریداری اور برآمدی دستاویزات کا اندراج۔", zh: "工厂备货、配件采购、出口资料备案" },
  },
  {
    key: "production",
    days: 12,
    title: { en: "Production & Assembly", ur: "پیداوار اور اسمبلی", zh: "生产组装" },
    detail: { en: "Custom vehicle production, functional parts installation and testing.", ur: "آپ کی منتخب کردہ گاڑی کی تیاری، فنکشنل پرزوں کی تنصیب اور جانچ۔", zh: "整车定制生产、功能配件安装调试" },
  },
  {
    key: "qc",
    days: 3,
    title: { en: "QC & Warehouse Outbound", ur: "کوالٹی چیک اور گودام سے روانگی", zh: "质检出库" },
    detail: { en: "QC passed, packing, outbound and customs preparation.", ur: "کوالٹی چیک پاس، پیکنگ، روانگی اور کسٹمز کی تیاری۔", zh: "质检合格、打包、出库、报关准备" },
  },
  {
    key: "shipping",
    days: 18,
    title: { en: "International Logistics", ur: "بین الاقوامی ترسیل", zh: "国际物流" },
    detail: { en: "International cross-border transport and port departure.", ur: "سرحد پار بین الاقوامی نقل و حمل اور بندرگاہ سے روانگی۔", zh: "国际跨境运输、港口发运" },
  },
  {
    key: "customs",
    days: 5,
    title: { en: "Pakistan Customs Clearance", ur: "پاکستان کسٹمز کلیئرنس", zh: "巴基斯坦清关" },
    detail: { en: "Customs clearance in Pakistan and tax verification.", ur: "پاکستان میں کسٹمز کلیئرنس اور ٹیکس کی تصدیق۔", zh: "巴基斯坦清关、完税核验" },
  },
  {
    key: "local",
    days: 3,
    title: { en: "Local Transportation", ur: "مقامی ترسیل", zh: "本地运输" },
    detail: { en: "Transport from the Pakistan port to your dealership store.", ur: "پاکستانی بندرگاہ سے آپ کی ڈیلرشپ تک نقل و حمل۔", zh: "巴国境内港口至车行门店运输" },
  },
  {
    key: "ready",
    days: 0,
    title: { en: "Store Completed & Ready For Pickup", ur: "اسٹور میں موصول — وصولی کے لیے تیار", zh: "门店入库、可提车" },
    detail: { en: "Your vehicle is in store. Visit the dealership to pick it up.", ur: "آپ کی گاڑی اسٹور پہنچ چکی ہے۔ ڈیلرشپ سے وصول کریں۔", zh: "门店入库完成、可到店提车" },
  },
];
export const LAST_STAGE = STAGES.length - 1;

/** Days still to go from the start of `stage` until the vehicle is in store. */
export const daysRemaining = (stage: number) => STAGES.slice(Math.max(stage, 1)).reduce((s, x) => s + x.days, 0);

export const stockStatus = (qty: number, low: number): StockStatus => (qty <= 0 ? "out" : qty <= low ? "low" : "in");
