import type { Config, GroupKey, Model, OptionGroup, OptionItem, QuoteLine } from "./types";

/** Shared by the live configurator (client) and the quote/order APIs (server) so both always agree. */

const enabledItems = (g: OptionGroup) => g.items.filter((i) => i.enabled);

/** Option groups as they apply to one model: a model with real factory paints uses those instead of the generic palette. */
export function groupsFor(model: Pick<Model, "colors">, options: OptionGroup[]): OptionGroup[] {
  const live = options.filter((g) => g.enabled && enabledItems(g).length > 0);
  const paints = (model.colors ?? []).filter((c) => c.enabled);
  if (!paints.length) return live;
  return live.map((g) => (g.key === "color" ? { ...g, items: paints.map((c) => ({ id: c.id, label: c.label, price: c.price, enabled: true, hex: c.hex })) } : g));
}

/** Kept for callers that only need the global, model-independent groups. */
export const activeGroups = (options: OptionGroup[]) => options.filter((g) => g.enabled && enabledItems(g).length > 0);

export function defaultConfig(model: Model, options: OptionGroup[]): Config {
  const c: Config = {};
  for (const g of groupsFor(model, options)) {
    const items = enabledItems(g);
    const preferred = g.key === "color" ? items.find((i) => i.id === model.defaultColor) : undefined;
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
