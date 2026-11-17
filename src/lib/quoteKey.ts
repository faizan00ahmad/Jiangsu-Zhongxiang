import { groupsFor, priceQuote } from "./pricing";
import type { Config, DB, Model, OptionGroup, Quote } from "./types";

/** A quotation number carries the build inside it: model, then the choice in every option group, then a short random tail.
 *  That way a quotation link still works on a server that never saw it (a serverless host starts several copies, each with its own memory):
 *  the build is read back from the number and priced again from today's catalogue. Anyone can write such a number, which is harmless because prices are never taken from it. */
export const QUOTE_ID_MAX = 140;

export function quoteIdFor(model: Model, options: OptionGroup[], config: Config, tail: string) {
  const values = groupsFor(model, options).map((g) => String(config[g.key] ?? "").replace(/[^\w-]/g, ""));
  return [model.slug, ...values, tail].join("~");
}

/** The quotation a number describes, priced now. It is not stored: whoever uses it (adds it to a cart, orders it) stores it. */
export function rebuildQuote(db: DB, id: string): Quote | null {
  const parts = id.split("~");
  if (parts.length < 3 || id.length > QUOTE_ID_MAX) return null;
  const model = db.models.find((m) => m.slug === parts[0] && m.enabled);
  if (!model) return null;
  const groups = groupsFor(model, db.options);
  const config: Config = {};
  groups.forEach((g, i) => {
    config[g.key] = parts[i + 1];
  });
  const p = priceQuote(model, db.options, config); // unknown or switched-off choices fall back to the defaults
  return { id, userId: null, model: model.slug, modelName: model.name, basePrice: model.basePrice, config: p.config, lines: p.lines, total: p.total, range: p.range, label: null, createdAt: new Date().toISOString() };
}

/** A stored quotation the visitor may use, or one rebuilt from its number. */
export function findQuote(db: DB, id: string, userId: string | null): Quote | undefined {
  const stored = db.quotes.find((q) => q.id === id);
  if (stored) return stored.userId === null || (userId !== null && stored.userId === userId) ? stored : undefined;
  return rebuildQuote(db, id) ?? undefined;
}

/** Anyone holding the link may look at a quotation (that is what makes it shareable); a number the server never saw is rebuilt. */
export const viewQuote = (db: DB, id: string): Quote | undefined => db.quotes.find((q) => q.id === id) ?? rebuildQuote(db, id) ?? undefined;

/** Same, but a rebuilt quotation is saved so that carts and orders can point at it. Call inside `mutate`. */
export function ensureQuote(db: DB, id: string, userId: string | null): Quote | undefined {
  const q = findQuote(db, id, userId);
  if (q && !db.quotes.some((x) => x.id === q.id)) db.quotes.push(q);
  return q;
}
