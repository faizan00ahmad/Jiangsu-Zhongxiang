import { guard } from "@/lib/server/admin";
import { hashPassword, randomId } from "@/lib/server/crypto";
import { mutate } from "@/lib/server/db";
import { fail, ok, readJson, str } from "@/lib/server/http";
import type { AdminRole } from "@/lib/types";

const ROLES: AdminRole[] = ["super", "operator", "dealer"];

export async function POST(req: Request) {
  const g = await guard("admins");
  if (g.res) return g.res;
  const b = await readJson(req);
  if (!b) return fail("invalid_input");
  const username = str(b.username, 40).toLowerCase();
  const name = str(b.name, 60);
  const role = ROLES.find((r) => r === b.role);
  const password = typeof b.password === "string" ? b.password : "";
  if (!/^[a-z0-9._-]{3,40}$/.test(username) || !name || !role) return fail("invalid_input");
  if (password.length < 8 || password.length > 200) return fail("weak_password");
  const dealerId = role === "dealer" ? str(b.dealerId, 40) : null;
  const passwordHash = hashPassword(password);
  const res = await mutate((db) => {
    if (db.admins.some((a) => a.username === username)) return "username_taken";
    if (role === "dealer" && !db.dealers.some((d) => d.id === dealerId)) return "invalid_input";
    db.admins.push({ id: randomId(8), username, name, role, dealerId, passwordHash, createdAt: new Date().toISOString(), disabled: false });
    return "ok";
  });
  return res === "ok" ? ok() : fail(res, 409);
}

export async function PATCH(req: Request) {
  const g = await guard("admins");
  if (g.res) return g.res;
  const b = await readJson(req);
  if (!b) return fail("invalid_input");
  const password = typeof b.password === "string" ? b.password : null;
  if (password !== null && (password.length < 8 || password.length > 200)) return fail("weak_password");
  const passwordHash = password ? hashPassword(password) : null;
  const res = await mutate((db) => {
    const a = db.admins.find((x) => x.id === b.id);
    if (!a) return "not_found";
    const self = a.id === g.admin.id;
    if (typeof b.disabled === "boolean") {
      if (self) return "self";
      a.disabled = b.disabled;
    }
    if (passwordHash) a.passwordHash = passwordHash;
    return "ok";
  });
  return res === "ok" ? ok() : fail(res, res === "not_found" ? 404 : 409);
}
