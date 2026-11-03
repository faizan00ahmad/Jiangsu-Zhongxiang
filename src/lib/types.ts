export type Lang = "en" | "ur";
export type AdminLang = "zh" | "en";
/** Customer-facing text: English + Urdu (the public site never shows Chinese). */
export type L = { en: string; ur: string };

export type VehicleKind = "commuter" | "sport" | "cargo" | "passenger";

export type Specs = {
  topSpeed: number; // km/h
  range: number; // km, with the Small battery
  motor: number; // W
  charge: number; // hours
  seats?: number;
  payload?: number; // kg
  weight: number; // kg
};

/** Product category key. The six factory lines (zxjtmco.com) are seeded; the admin can create more. */
export type Series = string;
export type Seo = { title: L; description: L; image: string | null; noindex: boolean };

/** A real paint option with its own studio photo. */
export type ModelColor = { id: string; label: L; hex: string; image: string | null; price: number; enabled: boolean };
export type SpecGroup = { group: string; items: { label: string; value: string }[] };

export type Model = {
  slug: string;
  kind: VehicleKind;
  series: Series;
  brand?: string | null; // brand slug
  views?: number;
  related?: string[]; // hand-picked similar models (slugs); empty = same category
  spin?: string[]; // full 360° turntable photos in order (one lap, evenly spaced); empty = the built-in angle shots
  hideOptions?: GroupKey[]; // option groups this model does not offer (e.g. solar on a sport bike)
  seo?: Seo | null;
  wheels: 2 | 3;
  name: string;
  tagline: L;
  basePrice: number; // PKR
  image: string | null; // photo uploaded in the admin; overrides the catalogue thumbnail
  photos: { thumb: string | null; banner: string | null; gallery: string[] };
  colors: ModelColor[]; // when present these replace the generic colour palette for this model
  specTable: SpecGroup[]; // full parameter table as published by the factory
  specsEstimated: boolean; // factory site publishes no figures — numbers need confirming
  variant: number; // illustration variant for the vector fallback
  defaultColor: string;
  specs: Specs;
  enabled: boolean;
  sort: number;
};

export type GroupKey = "color" | "wheel" | "gps" | "battery" | "display" | "cruise" | "reverse" | "standCut" | "speaker" | "solar";
export const GROUP_KEYS: GroupKey[] = ["color", "wheel", "gps", "battery", "display", "cruise", "reverse", "standCut", "speaker", "solar"];

export type OptionItem = { id: string; label: L; price: number; enabled: boolean; hex?: string; rangeFactor?: number; rangeKm?: number };
export type OptionGroup = {
  key: GroupKey;
  kind: "color" | "wheel" | "choice" | "toggle";
  label: L;
  hint: L;
  enabled: boolean;
  items: OptionItem[];
};

export type Config = Partial<Record<GroupKey, string>>;

export type QuoteLine = { group: GroupKey; item: string; groupLabel: L; label: L; price: number };

export type Quote = {
  id: string;
  userId: string | null;
  model: string;
  modelName: string;
  basePrice: number;
  config: Config;
  lines: QuoteLine[];
  total: number;
  range: number;
  label: string | null; // set when the user saved it as a named setup
  createdAt: string;
};

export type CityKey = "karachi" | "lahore" | "islamabad" | "rawalpindi" | "faisalabad" | "multan" | "peshawar" | "quetta" | "hyderabad" | "sialkot";

export type Dealer = {
  id: string;
  name: L;
  city: CityKey;
  address: L;
  phone: string;
  stock: Record<string, number>; // model slug → units ready for pickup
  enabled: boolean;
  hours?: L; // opening hours shown on the store page
  testDrive?: TestDriveRules;
  map?: string | null; // Google Maps link
  image?: string | null; // store photo
};

export type User = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  city: CityKey;
  passwordHash: string;
  createdAt: string;
  disabled: boolean;
  wishlist?: string[]; // model slugs
  provider?: "google" | "facebook" | null; // set when the account was created through social login
};

/** A role id: "super", "operator", "dealer" or one the admins created. Permissions live in `DB.roles`. */
/** days: 0 = Sunday … 6 = Saturday. `models` empty = every model. */
export type TestDriveRules = { enabled: boolean; models: string[]; days: number[]; from: string; to: string; slotMinutes: number; capacity: number };
export type AdminRole = string;
export type Admin = {
  id: string;
  username: string;
  name: string;
  role: AdminRole;
  dealerId: string | null;
  passwordHash: string;
  createdAt: string;
  disabled: boolean;
  lastLoginAt?: string | null;
};
export type AdminCtx = Admin & { perms: string[]; scope: "all" | "dealer" };
export type Role = { id: string; name: L; perms: string[]; scope: "all" | "dealer"; builtin: boolean };

export type Banner = {
  id: string;
  placement: "home" | "category";
  category: Series | null; // for category banners
  model: string | null; // slug: use this model's photo as the hero bike
  title: L;
  subtitle: L;
  cta: L;
  href: string;
  image: string | null; // wide photo (rider, scene); replaces the bike cut-out
  glow: string; // "r,g,b"
  start: string | null;
  end: string | null;
  sort: number;
  enabled: boolean;
};
export type PageDoc = { id: string; slug: string; kind: "page" | "policy" | "brand"; title: L; body: L; seo: Seo | null; enabled: boolean; updatedAt: string };
export type NavItem = { id: string; menu: "header" | "footer"; key: string | null; label: L; href: string; newTab: boolean; sort: number; enabled: boolean };
export type Post = { id: string; slug: string; title: L; excerpt: L; body: L; image: string | null; tags: string[]; status: "draft" | "published"; publishAt: string | null; seo: Seo | null; views: number; createdAt: string; updatedAt: string };
export type Brand = { id: string; slug: string; name: string; description: L; logo: string | null; enabled: boolean; sort: number };
export type Category = { id: string; slug: Series; name: L; blurb: L; image: string | null; bannerTitle: L; bannerText: L; sort: number; enabled: boolean };
export type Coupon = { id: string; code: string; type: "percent" | "fixed"; value: number; minTotal: number; maxDiscount: number; models: string[]; start: string | null; end: string | null; usageLimit: number; perUser: number; used: number; enabled: boolean };
export type Currency = { code: string; name: string; symbol: string; rate: number; decimals: number; enabled: boolean; base: boolean }; // rate = units of this currency per 1 PKR
export type Zone = { id: string; name: L; cities: CityKey[]; baseCost: number; extraDays: number; enabled: boolean }; // baseCost in PKR, charged on top of delivery
export type Review = { id: string; model: string; userId: string | null; name: string; rating: number; title: string; body: string; status: "pending" | "approved" | "rejected"; createdAt: string };
export type EnquiryForm = "sales" | "dealership" | "support" | "export";
export type Enquiry = { id: string; form: EnquiryForm; name: string; phone: string; email: string; city: string; model: string | null; message: string; status: "new" | "open" | "closed"; assignee: string | null; replies: { at: string; by: string; text: string }[]; createdAt: string };
export type ChatMsg = { from: "visitor" | "admin"; by: string; text: string; at: string };
export type Chat = { id: string; visitor: string; userId: string | null; name: string; status: "open" | "closed"; messages: ChatMsg[]; unread: number; createdAt: string; updatedAt: string };
export type TestDriveStatus = "requested" | "confirmed" | "completed" | "cancelled" | "no_show";
/** date is YYYY-MM-DD, time is HH:MM (store local time). */
export type TestDrive = { id: string; userId: string; name: string; phone: string; model: string; dealerId: string; date: string; time: string; status: TestDriveStatus; note: string; adminNote: string; createdAt: string; history: { at: string; by: string; action: string }[] };
export type PartnerType = "agent" | "distributor" | "affiliate";
export type PartnerApp = { id: string; type: PartnerType; name: string; business: string; phone: string; email: string; city: string; experience: string; shop: "none" | "shop" | "showroom"; message: string; status: "new" | "reviewing" | "approved" | "rejected"; assignee: string; adminNote: string; createdAt: string };
export type Channel = "email" | "sms" | "whatsapp";
export type Template = { id: string; event: string; channel: Channel; subject: L; body: L; enabled: boolean };
export type OutboxItem = { id: string; channel: Channel; to: string; subject: string; body: string; event: string; ref: string | null; status: "sandbox" | "sent" | "failed"; at: string };
export type AuditEntry = { id: string; at: string; adminId: string; adminName: string; action: string; entity: string; entityId: string; summary: string };
export type Integrations = {
  payments: Record<"jazzcash" | "easypaisa", { enabled: boolean; mode: "sandbox" | "live"; merchantId: string; secret: string }>;
  social: Record<"google" | "facebook", { enabled: boolean; clientId: string; secret: string }>;
  sms: { enabled: boolean; provider: string; sender: string; apiKey: string };
  meta: { pixelId: string; whatsapp: string; capiToken: string };
  smtp: { enabled: boolean; host: string; port: number; user: string; pass: string; from: string };
  webmaster: { googleVerification: string; bingVerification: string; analyticsId: string };
  chat: { enabled: boolean; welcome: L };
};

export type OrderStatus = "pending_payment" | "active" | "completed" | "cancelled" | "expired";
export type PayMethod = "jazzcash" | "easypaisa" | "bank" | "card";

export type Payment = {
  method: PayMethod;
  ref: string;
  amount: number;
  paidAt: string;
  verified: boolean;
  verifiedAt: string | null;
  verifiedBy: string | null;
};

export type Order = {
  id: string;
  userId: string;
  quoteId: string;
  model: string;
  modelName: string;
  config: Config;
  lines: QuoteLine[];
  basePrice: number;
  total: number;
  depositPercent: number;
  deposit: number;
  contact: { name: string; phone: string; city: CityKey; dealerId: string | null }; // the pickup store is chosen after ordering
  status: OrderStatus;
  stage: number; // index into STAGES
  stageTimes: (string | null)[];
  eta: string | null;
  trackingNo: string | null;
  carrier: string | null;
  payment: Payment | null;
  createdAt: string;
  lockExpiresAt: string;
  history: { at: string; by: string; action: string }[];
  discount?: number; // PKR taken off by a coupon
  couponCode?: string | null;
  shipping?: number; // PKR cross-border + zone charge estimate shown at checkout
  notes?: { at: string; by: string; text: string }[]; // internal, never shown to the customer
};

export type Settings = {
  depositPercent: number;
  lockHours: number; // unpaid orders release their reserved unit after this
  maxOpenOrders: number; // unpaid orders one customer may hold at once
  lowStock: number; // ≤ this (and > 0) shows "Low Stock"
  heroTitle: L;
  heroText: L;
  company?: { name: string; email: string; supportEmail?: string; phone: string; whatsapp?: string; address: L; hours?: L; map?: string | null };
  social?: { tiktok: string; facebook: string; instagram: string; youtube: string };
  maintenance?: boolean;
  seenModules?: string[]; // admin modules whose default role permissions were already handed out
  robotsExtra?: string; // extra lines appended to robots.txt
  sitemapEnabled?: boolean;
  defaultSeo?: Seo;
};

export const DB_VERSION = 3;
export type DB = {
  version: number;
  secret: string;
  settings: Settings;
  models: Model[];
  options: OptionGroup[];
  factoryStock: Record<string, number>;
  dealers: Dealer[];
  users: User[];
  admins: Admin[];
  quotes: Quote[];
  orders: Order[];
  // version 3
  roles: Role[];
  banners: Banner[];
  pages: PageDoc[];
  navItems: NavItem[];
  posts: Post[];
  brands: Brand[];
  categories: Category[];
  coupons: Coupon[];
  currencies: Currency[];
  zones: Zone[];
  reviews: Review[];
  enquiries: Enquiry[];
  chats: Chat[];
  testDrives: TestDrive[];
  partners: PartnerApp[];
  templates: Template[];
  outbox: OutboxItem[];
  audit: AuditEntry[];
  integrations: Integrations;
};

export type StockStatus = "in" | "low" | "out";
