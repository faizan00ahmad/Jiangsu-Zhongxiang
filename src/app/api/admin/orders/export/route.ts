import { CITIES, STAGES } from "@/lib/catalog";
import { guard, visibleOrders } from "@/lib/server/admin";
import { getDb } from "@/lib/server/db";
import { getAdminLang } from "@/lib/server/session";
import { ADMIN_DICT } from "@/i18n/admin";
import type { OrderStatus } from "@/lib/types";

/** CSV (UTF-8 with BOM so Excel opens Chinese correctly). Optional ?status= filter. */
export async function GET(req: Request) {
  const g = await guard("orders");
  if (g.res) return g.res;
  const lang = await getAdminLang();
  const t = ADMIN_DICT[lang];
  const status = new URL(req.url).searchParams.get("status") as OrderStatus | null;
  const db = await getDb();
  const rows = visibleOrders(db, g.admin).filter((o) => !status || o.status === status);
  // neutralise spreadsheet formulas in user-entered text
  const cell = (v: unknown) => {
    let s = v === null || v === undefined ? "" : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  };
  const head = [t.orders.id, t.orders.created, t.orders.status, t.orders.current, t.orders.model, t.orders.config, t.orders.total, t.orders.deposit, t.orders.verify, t.orders.customer, t.orders.contact, t.orders.dealer, t.inventory.city, t.orders.trackingNo, t.orders.carrier, t.orders.eta];
  const lines = rows.map((o) => {
    const d = db.dealers.find((x) => x.id === o.contact.dealerId);
    return [
      o.id,
      o.createdAt,
      t.orders.statuses[o.status],
      STAGES[o.stage].title[lang],
      o.modelName,
      o.lines.map((l) => `${l.groupLabel.en}: ${l.label.en}${l.price ? ` (+${l.price})` : ""}`).join("; "),
      o.total,
      o.deposit,
      o.payment ? (o.payment.verified ? t.orders.verified : t.orders.unverified) : t.orders.notPaid,
      db.users.find((u) => u.id === o.userId)?.name ?? "",
      `${o.contact.name} ${o.contact.phone}`,
      d?.name.en ?? "",
      CITIES[o.contact.city]?.[lang] ?? "",
      o.trackingNo ?? "",
      o.carrier ?? "",
      o.eta ?? "",
    ]
      .map(cell)
      .join(",");
  });
  const csv = "﻿" + [head.map(cell).join(","), ...lines].join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="zx-orders-${stamp}.csv"`, "cache-control": "no-store" } });
}
