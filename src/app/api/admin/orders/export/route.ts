import { CITIES, STAGES } from "@/lib/catalog";
import { ADMIN_DICT } from "@/i18n/admin";
import { audit, guard, visibleOrders } from "@/lib/server/admin";
import { getDb, mutate } from "@/lib/server/db";
import { getAdminLang } from "@/lib/server/session";
import { XLSX_TYPE, buildXlsx } from "@/lib/server/xlsx";
import type { OrderStatus } from "@/lib/types";

/** Orders as Excel (default) or CSV (UTF-8 with BOM). Optional ?status= filter. Dealer roles only export their own store. */
export async function GET(req: Request) {
  const g = await guard("orders.export");
  if (g.res) return g.res;
  const lang = await getAdminLang();
  const t = ADMIN_DICT[lang];
  const url = new URL(req.url);
  const status = url.searchParams.get("status") as OrderStatus | null;
  const csv = url.searchParams.get("format") === "csv";
  const db = await getDb();
  const rows = visibleOrders(db, g.admin).filter((o) => !status || o.status === status);
  const head = [t.orders.id, t.orders.created, t.orders.status, t.orders.current, t.orders.model, t.orders.config, "Coupon", "Discount", t.orders.total, t.orders.deposit, t.orders.verify, t.orders.customer, t.orders.contact, t.orders.dealer, t.inventory.city, t.orders.trackingNo, t.orders.carrier, t.orders.eta];
  const data = rows.map((o) => {
    const d = db.dealers.find((x) => x.id === o.contact.dealerId);
    return [
      o.id,
      o.createdAt,
      t.orders.statuses[o.status],
      STAGES[o.stage].title[lang],
      o.modelName,
      o.lines.map((l) => `${l.groupLabel.en}: ${l.label.en}${l.price ? ` (+${l.price})` : ""}`).join("; "),
      o.couponCode ?? "",
      o.discount ?? 0,
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
    ];
  });
  await mutate((x) => audit(x, g.admin, "export", "orders", csv ? "csv" : "xlsx", `${data.length} rows`));
  const stamp = new Date().toISOString().slice(0, 10);
  if (csv) {
    const cell = (v: unknown) => {
      let s = v === null || v === undefined ? "" : String(v);
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // neutralise spreadsheet formulas in user-entered text
      return `"${s.replace(/"/g, '""')}"`;
    };
    const body = "﻿" + [head.map(cell).join(","), ...data.map((r) => r.map(cell).join(","))].join("\r\n");
    return new Response(body, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="evolta-orders-${stamp}.csv"`, "cache-control": "no-store" } });
  }
  return new Response(new Uint8Array(buildXlsx(t.orders.title.slice(0, 30), head, data)), { headers: { "content-type": XLSX_TYPE, "content-disposition": `attachment; filename="evolta-orders-${stamp}.xlsx"`, "cache-control": "no-store" } });
}
