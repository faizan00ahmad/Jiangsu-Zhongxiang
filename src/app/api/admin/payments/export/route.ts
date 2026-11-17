import { audit, guard } from "@/lib/server/admin";
import { getDb, mutate } from "@/lib/server/db";
import { METHOD_NAME } from "@/lib/server/payments";
import { XLSX_TYPE, buildXlsx } from "@/lib/server/xlsx";

export async function GET(req: Request) {
  const g = await guard("payments.export");
  if (g.res) return g.res;
  if (g.admin.scope === "dealer") return new Response("Forbidden", { status: 403 });
  const db = await getDb();
  const csv = new URL(req.url).searchParams.get("format") === "csv";
  const head = ["Attempt", "Reference", "Date", "Status", "Method", "Mode", "Amount PKR", "Customer", "Phone", "Orders", "Card / wallet", "Reviewed by", "Note"];
  const rows = [...db.payIntents].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((i) => {
    const u = db.users.find((x) => x.id === i.userId);
    const channel = i.channel.last4 ? `${i.channel.brand} ····${i.channel.last4}` : (i.channel.wallet ?? "");
    return [i.id, i.ref, i.createdAt, i.status, METHOD_NAME[i.method], i.mode, i.amount, u?.name ?? "", u?.phone ?? "", i.orderIds.join(" "), channel, i.reviewedBy ?? "", i.reviewNote];
  });
  await mutate((x) => audit(x, g.admin, "export", "payments", csv ? "csv" : "xlsx", `${rows.length} rows`));
  const stamp = new Date().toISOString().slice(0, 10);
  if (csv) {
    const cell = (v: unknown) => {
      let s = String(v ?? "");
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
      return `"${s.replace(/"/g, '""')}"`;
    };
    return new Response("﻿" + [head, ...rows].map((r) => r.map(cell).join(",")).join("\r\n"), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="evolta-payments-${stamp}.csv"` } });
  }
  return new Response(new Uint8Array(buildXlsx("Payments", head, rows)), { headers: { "content-type": XLSX_TYPE, "content-disposition": `attachment; filename="evolta-payments-${stamp}.xlsx"` } });
}
