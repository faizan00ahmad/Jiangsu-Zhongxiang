import type { Config, GroupKey, Model, OptionGroup, OptionItem, QuoteLine } from "./types";

/** Shared by the live configurator (client) and the quote/order APIs (server) so both always agree. */

const enabledItems = (g: OptionGroup) => g.items.filter((i) => i.enabled);

/** Option groups as they apply to one model: a model with real factory paints uses those instead of the generic palette. */
export const STD_COLOR = "std";

export function groupsFor(model: Pick<Model, "colors" | "photos" | "image">, options: OptionGroup[]): OptionGroup[] {
  const live = options.filter((g) => g.enabled && enabledItems(g).length > 0);
  const paints = (model.colors ?? []).filter((c) => c.enabled);
  const photo = model.image ?? model.photos?.thumb ?? null;
  const hint = paints.length
    ? { en: "The photo changes with every paint.", ur: "ہر رنگ کے ساتھ تصویر بدلتی ہے۔" }
    : photo
      ? { en: "Pick a colour to preview it on the product photo.", ur: "پروڈکٹ کی تصویر پر دیکھنے کے لیے رنگ منتخب کریں۔" }
      : { en: "Choose your paint. It is applied at the factory.", ur: "اپنا رنگ منتخب کریں۔ یہ فیکٹری میں لگایا جائے گا۔" };
  // a model with one photo gets a "Standard" swatch (the photo as shot) ahead of the colours that recolour it
  const standard: OptionItem = { id: STD_COLOR, label: { en: "Standard", ur: "معیاری" }, price: 0, enabled: true };
  return live.map((g) => {
    if (g.key !== "color") return g;
    if (paints.length) return { ...g, hint, items: paints.map((c) => ({ id: c.id, label: c.label, price: c.price, enabled: true, hex: c.hex })) };
    return { ...g, hint, items: photo ? [standard, ...g.items] : g.items };
  });
}

/** Kept for callers that only need the global, model-independent groups. */
export const activeGroups = (options: OptionGroup[]) => options.filter((g) => g.enabled && enabledItems(g).length > 0);

export function defaultConfig(model: Model, options: OptionGroup[]): Config {
  const c: Config = {};
  for (const g of groupsFor(model, options)) {
    const items = enabledItems(g);
    const preferred = g.key === "color" ? (items.find((i) => i.id === STD_COLOR) ?? items.find((i) => i.id === model.defaultColor)) : undefined;
    c[g.key] = (preferred ?? items.find((i) => i.price === 0) ?? items[0]).id;
  }
  return c;
}

/** Drops unknown/disabled picks and fills gaps with defaults. */
export function normalizeConfig(model: Model, options: OptionGroup[], input: Config | Record<string, unknown> | null | undefined): Config {
  const base = defaultConfig(model, options);
  if (!input || typeof input !== "object") return base;
  const out: Config = {};
  for (const g of groupsFor(model, options)) {
    const v = (input as Record<string, unknown>)[g.key];
    out[g.key] = typeof v === "string" && enabledItems(g).some((i) => i.id === v) ? v : base[g.key];
  }
  return out;
}

export function pickItem(options: OptionGroup[], key: GroupKey, id: string | undefined): OptionItem | undefined {
  return options.find((g) => g.key === key)?.items.find((i) => i.id === id);
}

export function priceQuote(model: Model, options: OptionGroup[], config: Config) {
  const c = normalizeConfig(model, options, config);
  const lines: QuoteLine[] = [];
  for (const g of groupsFor(model, options)) {
    const item = g.items.find((i) => i.id === c[g.key]);
    if (!item) continue;
    lines.push({ group: g.key, item: item.id, groupLabel: g.label, label: item.label, price: item.price });
  }
  const extras = lines.reduce((s, l) => s + l.price, 0);
  const factor = pickItem(options, "battery", c.battery)?.rangeFactor ?? 1;
  return { config: c, lines, extras, total: model.basePrice + extras, range: Math.round(model.specs.range * factor) };
}

export const depositFor = (total: number, percent: number) => Math.round((total * percent) / 100 / 100) * 100;
