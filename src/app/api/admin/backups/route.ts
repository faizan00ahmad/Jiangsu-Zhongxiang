import { audit, guard } from "@/lib/server/admin";
import { clearAll } from "@/lib/server/cache";
import { backupNow, mutate, readBackupFile, restoreBackup } from "@/lib/server/db";
import { fail, ok, readJson } from "@/lib/server/http";

/** POST {action:"create"} makes a manual backup; POST {action:"restore", name} swaps it in (after saving the current data first). */
export async function POST(req: Request) {
  const b = await readJson<{ action?: string; name?: string }>(req);
  if (!b) return fail("invalid_input");
  if (b.action === "restore") {
    const g = await guard("backups.edit");
    if (g.res) return g.res;
    const r = await restoreBackup(String(b.name ?? ""));
    if (r !== "ok") return fail(r === "not_found" ? "not_found" : "bad_backup", r === "not_found" ? 404 : 400);
    await mutate((db) => audit(db, g.admin, "restore", "backups", String(b.name), "database restored from backup"));
    clearAll(g.admin.name);
    return ok();
  }
  const g = await guard("backups.create");
  if (g.res) return g.res;
  try {
    const name = await backupNow("manual");
    await mutate((db) => audit(db, g.admin, "create", "backups", name, "manual backup"));
    return ok({ name });
  } catch {
    return fail("server", 500);
  }
}

export async function GET(req: Request) {
  const g = await guard("backups.export");
  if (g.res) return g.res;
  const name = new URL(req.url).searchParams.get("name") ?? "";
  const buf = await readBackupFile(name);
  if (!buf) return fail("not_found", 404);
  return new Response(new Uint8Array(buf), { headers: { "content-type": "application/json", "content-disposition": `attachment; filename="${name}"` } });
}
