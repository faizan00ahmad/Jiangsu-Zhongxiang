import { audit, guard } from "@/lib/server/admin";
import { getDb, mutate } from "@/lib/server/db";
import { XLSX_TYPE, buildXlsx } from "@/lib/server/xlsx";

export async function GET(req: Request) {
  const g = await guard("testdrives.export");
  if (g.res) return g.res;
  const db = await getDb();
  const csv = new URL(req.url).searchParams.get("format") === "csv";
  const list = db.testDrives.filter((t) => g.admin.scope !== "dealer" || t.dealerId === g.admin.dealerId);
  const head = ["Booking", "Date", "Time", "Status", "Model", "Store", "Customer", "Phone", "Note", "Staff note", "Requested"];
  const rows = list.map((t) => [t.id, t.date, t.time, t.status, db.models.find((m) => m.slug === t.model)?.name ?? t.model, db.dealers.find((d) => d.id === t.dealerId)?.name.en ?? "", t.name, t.phone, t.note, t.adminNote, t.createdAt]);
  await mutate((x) => audit(x, g.admin, "export", "testdrives", csv ? "csv" : "xlsx", `${rows.length} rows`));
  const stamp = new Date().toISOString().slice(0, 10);
  if (csv) {
    const cell = (v: unknown) => {
      let s = String(v ?? "");
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
      return `"${s.replace(/"/g, '""')}"`;
    };
    return new Response("﻿" + [head, ...rows].map((r) => r.map(cell).join(",")).join("\r\n"), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="evolta-test-drives-${stamp}.csv"` } });
  }
  return new Response(new Uint8Array(buildXlsx("Test drives", head, rows)), { headers: { "content-type": XLSX_TYPE, "content-disposition": `attachment; filename="evolta-test-drives-${stamp}.xlsx"` } });
}
