import { stockStatus } from "../catalog";
import type { DB, Model } from "../types";
import { getDb } from "./db";

export async function siteData() {
  const db = await getDb();
  const models = db.models.filter((m) => m.enabled).sort((a, b) => a.sort - b.sort);
  return { db, models, colors: colorMap(db) };
}

export const colorMap = (db: DB) => Object.fromEntries((db.options.find((g) => g.key === "color")?.items ?? []).map((i) => [i.id, i.hex ?? "#888"]));

export const modelColor = (db: DB, m: Model) => colorMap(db)[m.defaultColor] ?? "#cfd4dc";

export function factoryStatus(db: DB, slug: string) {
  const qty = db.factoryStock[slug] ?? 0;
  return { qty, status: stockStatus(qty, db.settings.lowStock) };
}
