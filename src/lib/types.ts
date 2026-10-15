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

/** Factory product line the model comes from (zxjtmco.com categories). */
export type Series = "motorcycle" | "scooter" | "eec" | "light" | "bicycle" | "tricycle";

/** A real paint option with its own studio photo. */
export type ModelColor = { id: string; label: L; hex: string; image: string | null; price: number; enabled: boolean };
export type SpecGroup = { group: string; items: { label: string; value: string }[] };

export type Model = {
  slug: string;
  kind: VehicleKind;
  series: Series;
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

export type GroupKey = "color" | "wheel" | "gps" | "battery" | "display" | "cruise" | "reverse" | "standCut" | "speaker";
export const GROUP_KEYS: GroupKey[] = ["color", "wheel", "gps", "battery", "display", "cruise", "reverse", "standCut", "speaker"];

export type OptionItem = { id: string; label: L; price: number; enabled: boolean; hex?: string; rangeFactor?: number };
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
};

export type AdminRole = "super" | "operator" | "dealer";
export type Admin = {
  id: string;
  username: string;
  name: string;
  role: AdminRole;
  dealerId: string | null;
  passwordHash: string;
  createdAt: string;
  disabled: boolean;
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
  contact: { name: string; phone: string; city: CityKey; dealerId: string };
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
};

export type Settings = {
  depositPercent: number;
  lockHours: number; // unpaid orders release their reserved unit after this
  maxOpenOrders: number; // unpaid orders one customer may hold at once
  lowStock: number; // ≤ this (and > 0) shows "Low Stock"
  heroTitle: L;
  heroText: L;
};

export const DB_VERSION = 2;
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
};

export type StockStatus = "in" | "low" | "out";
