import { ALL_PERMS } from "@/lib/perms";
import { audit, guard } from "@/lib/server/admin";
import { mutate } from "@/lib/server/db";
import { fail, ok, readJson, str } from "@/lib/server/http";
import type { Role } from "@/lib/types";

/** Only known permissions survive, and any write permission pulls in "view" for its module. */
function cleanPerms(v: unknown): string[] {
  const set = new Set((Array.isArray(v) ? v : []).filter((p): p is string => typeof p === "string" && ALL_PERMS.includes(p)));
  for (const p of [...set]) set.add(`${p.split(".")[0]}.view`);
  return ALL_PERMS.filter((p) => set.has(p));
}

export async function POST(req: Request) {
  const g = await guard("roles.create");
  if (g.res) return g.res;
  const b = await readJson(req);
  if (!b) return fail("invalid_input");
  const en = str((b.name as Record<string, unknown> | undefined)?.en, 40);
  const ur = str((b.name as Record<string, unknown> | undefined)?.ur, 40);
  const id = en.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30);
  if (!en || !id) return fail("required");
  const scope: Role["scope"] = b.scope === "dealer" ? "dealer" : "all";
  const res = await mutate((db) => {
    if (db.roles.some((r) => r.id === id)) return "slug_taken";
    db.roles.push({ id, name: { en, ur: ur || en }, perms: cleanPerms(b.perms), scope, builtin: false });
    audit(db, g.admin, "create", "roles", id, en);
    return "ok";
  });
  return res === "ok" ? ok({ id }) : fail(res, 409);
}

export async function PUT(req: Request) {
  const g = await guard("roles.edit");
  if (g.res) return g.res;
  const b = await readJson(req);
  if (!b) return fail("invalid_input");
  const res = await mutate((db) => {
    const r = db.roles.find((x) => x.id === b.id);
    if (!r) return "not_found";
    if (r.id === "super") return "read_only"; // the super admin always holds every permission
    const en = str((b.name as Record<string, unknown> | undefined)?.en, 40);
    const ur = str((b.name as Record<string, unknown> | undefined)?.ur, 40);
    if (en) r.name = { en, ur: ur || en };
    r.perms = cleanPerms(b.perms);
    if (!r.builtin) r.scope = b.scope === "dealer" ? "dealer" : "all";
    audit(db, g.admin, "update", "roles", r.id, `${r.perms.length} permissions`);
    return "ok";
  });
  return res === "ok" ? ok() : fail(res, res === "not_found" ? 404 : 409);
}

export async function DELETE(req: Request) {
  const g = await guard("roles.delete");
  if (g.res) return g.res;
  const b = await readJson(req);
  if (!b) return fail("invalid_input");
  const res = await mutate((db) => {
    const i = db.roles.findIndex((x) => x.id === b.id);
    if (i < 0) return "not_found";
    if (db.roles[i].builtin) return "read_only";
    if (db.admins.some((a) => a.role === b.id)) return "role_in_use";
    audit(db, g.admin, "delete", "roles", String(b.id), db.roles[i].name.en);
    db.roles.splice(i, 1);
    return "ok";
  });
  return res === "ok" ? ok() : fail(res, res === "not_found" ? 404 : 409);
}
