import { audit, guard } from "@/lib/server/admin";
import { hashPassword, randomId } from "@/lib/server/crypto";
import { mutate } from "@/lib/server/db";
import { fail, ok, readJson, str } from "@/lib/server/http";
import type { DB } from "@/lib/types";

const supers = (db: DB) => db.admins.filter((a) => a.role === "super" && !a.disabled).length;

export async function POST(req: Request) {
  const g = await guard("admins.create");
  if (g.res) return g.res;
  const b = await readJson(req);
  if (!b) return fail("invalid_input");
  const username = str(b.username, 40).toLowerCase();
  const name = str(b.name, 60);
  const roleId = str(b.role, 40);
  const password = typeof b.password === "string" ? b.password : "";
  if (!/^[a-z0-9._-]{3,40}$/.test(username) || !name || !roleId) return fail("invalid_input");
  if (password.length < 8 || password.length > 200) return fail("weak_password");
  const passwordHash = hashPassword(password);
  const res = await mutate((db) => {
    const role = db.roles.find((r) => r.id === roleId);
    if (!role) return "invalid_input";
    if (db.admins.some((a) => a.username === username)) return "username_taken";
    const dealerId = role.scope === "dealer" ? str(b.dealerId, 40) : null;
    if (role.scope === "dealer" && !db.dealers.some((d) => d.id === dealerId)) return "invalid_input";
    db.admins.push({ id: randomId(8), username, name, role: role.id, dealerId, passwordHash, createdAt: new Date().toISOString(), disabled: false, lastLoginAt: null });
    audit(db, g.admin, "create", "admins", username, `${name} · ${role.id}`);
    return "ok";
  });
  return res === "ok" ? ok() : fail(res, res === "invalid_input" ? 400 : 409);
}

export async function PATCH(req: Request) {
  const g = await guard("admins.edit");
  if (g.res) return g.res;
  const b = await readJson(req);
  if (!b) return fail("invalid_input");
  const password = typeof b.password === "string" && b.password ? b.password : null;
  if (password !== null && (password.length < 8 || password.length > 200)) return fail("weak_password");
  const passwordHash = password ? hashPassword(password) : null;
  const res = await mutate((db) => {
    const a = db.admins.find((x) => x.id === b.id);
    if (!a) return "not_found";
    const self = a.id === g.admin.id;
    if (typeof b.disabled === "boolean") {
      if (self) return "self";
      if (b.disabled && a.role === "super" && supers(db) <= 1) return "last_super";
      a.disabled = b.disabled;
    }
    if (typeof b.role === "string" && b.role !== a.role) {
      if (self) return "self";
      const role = db.roles.find((r) => r.id === b.role);
      if (!role) return "invalid_input";
      if (a.role === "super" && supers(db) <= 1) return "last_super";
      a.role = role.id;
      a.dealerId = role.scope === "dealer" ? (db.dealers.some((d) => d.id === str(b.dealerId, 40)) ? str(b.dealerId, 40) : (a.dealerId ?? db.dealers[0]?.id ?? null)) : null;
    } else if (typeof b.dealerId === "string" && db.roles.find((r) => r.id === a.role)?.scope === "dealer" && db.dealers.some((d) => d.id === b.dealerId)) {
      a.dealerId = b.dealerId;
    }
    if (typeof b.name === "string" && str(b.name, 60)) a.name = str(b.name, 60);
    if (passwordHash) a.passwordHash = passwordHash;
    audit(db, g.admin, "update", "admins", a.username, [typeof b.disabled === "boolean" ? (b.disabled ? "disabled" : "enabled") : "", passwordHash ? "password reset" : "", typeof b.role === "string" ? `role ${b.role}` : ""].filter(Boolean).join(", "));
    return "ok";
  });
  return res === "ok" ? ok() : fail(res, res === "not_found" ? 404 : res === "invalid_input" ? 400 : 409);
}
