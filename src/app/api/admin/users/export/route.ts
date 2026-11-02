import { CITIES } from "@/lib/catalog";
import { audit, guard } from "@/lib/server/admin";
import { getDb, mutate } from "@/lib/server/db";
import { fail } from "@/lib/server/http";
import { XLSX_TYPE, buildXlsx } from "@/lib/server/xlsx";

/** Customers as Excel or CSV (?format=csv). Password hashes are never included. */
export async function GET(req: Request) {
  const g = await guard("users.export");
  if (g.res) return g.res;
  const db = await getDb();
  const csv = new URL(req.url).searchParams.get("format") === "csv";
  const head = ["Name", "Phone", "Email", "City", "Registered", "Sign-in", "Orders", "Order value PKR", "Quotes", "Disabled"];
  const rows = db.users.map((u) => {
    const orders = db.orders.filter((o) => o.userId === u.id && o.status !== "cancelled" && o.status !== "expired");
    return [u.name, u.phone, u.email ?? "", CITIES[u.city]?.en ?? u.city, u.createdAt, u.provider ?? "phone", orders.length, orders.reduce((s, o) => s + o.total, 0), db.quotes.filter((q) => q.userId === u.id).length, u.disabled ? "yes" : "no"];
  });
  if (!rows) return fail("server", 500);
  await mutate((x) => audit(x, g.admin, "export", "users", csv ? "csv" : "xlsx", `${rows.length} rows`));
  const stamp = new Date().toISOString().slice(0, 10);
  if (csv) {
    const cell = (v: unknown) => {
      let s = String(v ?? "");
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
      return `"${s.replace(/"/g, '""')}"`;
    };
    return new Response("﻿" + [head, ...rows].map((r) => r.map(cell).join(",")).join("\r\n"), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="evolta-customers-${stamp}.csv"` } });
  }
  return new Response(new Uint8Array(buildXlsx("Customers", head, rows)), { headers: { "content-type": XLSX_TYPE, "content-disposition": `attachment; filename="evolta-customers-${stamp}.xlsx"` } });
}
