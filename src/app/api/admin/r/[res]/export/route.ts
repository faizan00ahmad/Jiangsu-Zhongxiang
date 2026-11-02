import { RESOURCE } from "@/lib/admin/resources";
import { audit, guard } from "@/lib/server/admin";
import { getDb, mutate } from "@/lib/server/db";
import { fail } from "@/lib/server/http";
import { exportRows } from "@/lib/server/resourceApi";
import { XLSX_TYPE, buildXlsx } from "@/lib/server/xlsx";
import { getAdminLang } from "@/lib/server/session";

const csvCell = (v: string) => `"${(/^[=+\-@\t\r]/.test(v) ? `'${v}` : v).replace(/"/g, '""')}"`;

/** GET /api/admin/r/<resource>/export?format=xlsx|csv: the whole collection as a spreadsheet. */
export async function GET(req: Request, ctx: { params: Promise<{ res: string }> }) {
  const res = RESOURCE[(await ctx.params).res];
  if (!res) return fail("not_found", 404);
  const g = await guard(`${res.module}.export`);
  if (g.res) return g.res;
  const lang = await getAdminLang();
  const { header, rows } = exportRows(res, await getDb(), lang);
  const fmt = new URL(req.url).searchParams.get("format") === "csv" ? "csv" : "xlsx";
  await mutate((db) => audit(db, g.admin, "export", res.key, fmt, `${rows.length} rows`));
  const stamp = new Date().toISOString().slice(0, 10);
  const name = `${res.key}-${stamp}.${fmt}`;
  if (fmt === "csv") {
    const text = "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
    return new Response(text, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${name}"` } });
  }
  const buf = buildXlsx(res.title[lang], header, rows);
  return new Response(new Uint8Array(buf), { headers: { "content-type": XLSX_TYPE, "content-disposition": `attachment; filename="${name}"` } });
}
