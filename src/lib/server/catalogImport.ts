import raw from "@/data/zx-catalog.json";
import { colorName } from "../colorNames";
import type { L, Model, ModelColor, Series, SpecGroup, Specs, VehicleKind } from "../types";

/** Turns the product data captured from zxjtmco.com (src/data/zx-catalog.json) into site models.
 *  Prices are placeholders for the team to set; specs come from the factory tables where published. */

type Raw = { id: number; slug: string; name: string; series: Series; source: string; specs: SpecGroup[]; thumb: string | null; banner: string | null; colors: { hex: string | null; image: string }[]; gallery: string[] };

const TAGLINE: Record<string, L> = {
  motorcycle: { en: "Full-size electric motorcycle with real highway pace.", ur: "ہائی وے رفتار کے ساتھ مکمل سائز الیکٹرک موٹر سائیکل۔" },
  scooter: { en: "Comfortable electric scooter for the daily city run.", ur: "روزمرہ شہری سفر کے لیے آرام دہ الیکٹرک اسکوٹر۔" },
  eec: { en: "EEC-certified scooter built to European road standards.", ur: "یورپی سڑک معیار کے مطابق ای ای سی سرٹیفائیڈ اسکوٹر۔" },
  light: { en: "Light, nimble scooter for short city trips.", ur: "مختصر شہری سفر کے لیے ہلکا اور پھرتیلا اسکوٹر۔" },
  bicycle: { en: "Pedal-assist electric bicycle, easy to ride and park.", ur: "پیڈل اسسٹ الیکٹرک سائیکل، چلانے اور پارک کرنے میں آسان۔" },
  passenger: { en: "Three-wheel carrier for family and passengers.", ur: "خاندان اور مسافروں کے لیے تین پہیہ سواری۔" },
  cargo: { en: "Heavy-duty three-wheel cargo loader.", ur: "مضبوط تین پہیہ مال بردار لوڈر۔" },
};

// typical figures used only where the factory publishes none
const FALLBACK: Record<string, Specs> = {
  motorcycle: { topSpeed: 90, range: 100, motor: 3000, charge: 6, weight: 120, seats: 2 },
  scooter: { topSpeed: 60, range: 80, motor: 1500, charge: 7, weight: 80, seats: 2 },
  eec: { topSpeed: 45, range: 50, motor: 1000, charge: 7, weight: 60, seats: 2 },
  light: { topSpeed: 45, range: 50, motor: 800, charge: 6, weight: 55, seats: 1 },
  bicycle: { topSpeed: 25, range: 60, motor: 350, charge: 5, weight: 25, seats: 1 },
  passenger: { topSpeed: 35, range: 60, motor: 1000, charge: 8, weight: 150, seats: 3 },
  cargo: { topSpeed: 40, range: 80, motor: 1500, charge: 8, weight: 300, payload: 500 },
};

const PRICE: Record<string, (motor: number) => number> = {
  motorcycle: (w) => 300000 + w * 50,
  scooter: (w) => 150000 + w * 25,
  eec: (w) => 170000 + w * 25,
  light: (w) => 110000 + w * 30,
  bicycle: (w) => 90000 + w * 60,
  passenger: () => 360000,
  cargo: () => 420000,
};

// the Pakistan export line-up from the requirement: 2W commuter, 2W sport, 3W cargo, 3W passenger (10 models)
const LISTED = new Set(["r-xfx", "r-jlong", "retro-cg", "crown-ii", "phoenix", "griffin", "dubhe", "alkaid", "zx-x-cool", "zx-jl"]);
const SERIES_ORDER: Series[] = ["scooter", "motorcycle", "tricycle", "eec", "light", "bicycle"];

const nums = (s: string | undefined) => (s ? (s.match(/\d+(?:\.\d+)?/g) ?? []).map(Number) : []);
function find(table: SpecGroup[], re: RegExp) {
  for (const g of table) for (const i of g.items) if (re.test(i.label)) return i.value;
  return undefined;
}

function kindOf(r: Raw): VehicleKind {
  if (r.series === "motorcycle") return "sport";
  if (r.series === "tricycle") return r.slug === "zx-jl" ? "cargo" : "passenger";
  return "commuter";
}

function specsOf(r: Raw, key: string): { specs: Specs; estimated: boolean } {
  const fb = FALLBACK[key];
  const t = r.specs;
  const speed = Math.max(...nums(find(t, /max\.?\s*speed|top speed/i)), 0);
  const range = nums(find(t, /range|mileage/i))[0];
  const motor = Math.max(...nums(find(t, /^motor$|rated power|motor power/i)), 0);
  const charge = nums(find(t, /charg/i))[0];
  const weight = nums(find(t, /net weig|weight/i))[0];
  const specs: Specs = {
    topSpeed: speed || fb.topSpeed,
    range: range || fb.range,
    motor: motor || fb.motor,
    charge: charge || fb.charge,
    weight: weight || fb.weight,
    ...(fb.payload ? { payload: fb.payload } : { seats: fb.seats }),
  };
  return { specs, estimated: !speed || !range || !motor };
}

function colorsOf(r: Raw): ModelColor[] {
  const seen = new Map<string, number>();
  return r.colors.map((c, i) => {
    const hex = c.hex && /^#[0-9a-f]{3,6}$/i.test(c.hex) ? c.hex : "#9a9a9a";
    const label = c.hex ? colorName(hex) : { en: `Style ${i + 1}`, ur: `اسٹائل ${i + 1}` };
    const n = (seen.get(label.en) ?? 0) + 1;
    seen.set(label.en, n);
    if (n > 1) {
      label.en += ` ${n}`;
      label.ur += ` ${n}`;
    }
    return { id: `c${i + 1}`, label, hex, image: c.image, price: 0, enabled: true };
  });
}

export function importCatalog(): Model[] {
  return (raw as Raw[])
    .map((r) => {
      const kind = kindOf(r);
      const key = r.series === "tricycle" ? kind : r.series;
      const { specs, estimated } = specsOf(r, key);
      const colors = colorsOf(r);
      return {
        slug: r.slug,
        kind,
        series: r.series,
        wheels: r.series === "tricycle" ? 3 : 2,
        name: r.name,
        tagline: TAGLINE[key],
        basePrice: Math.round(PRICE[key](specs.motor) / 1000) * 1000,
        image: null,
        photos: { thumb: r.thumb, banner: r.banner, gallery: r.gallery },
        colors,
        specTable: r.specs,
        specsEstimated: estimated,
        variant: 0,
        defaultColor: colors[0]?.id ?? "pearl",
        specs,
        enabled: LISTED.has(r.slug),
        sort: 0,
      } satisfies Model;
    })
    .sort((a, b) => Number(b.enabled) - Number(a.enabled) || SERIES_ORDER.indexOf(a.series) - SERIES_ORDER.indexOf(b.series))
    .map((m, i) => ({ ...m, sort: i + 1 }));
}
