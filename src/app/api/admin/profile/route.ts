import { audit } from "@/lib/server/admin";
import { hashPassword, verifyPassword } from "@/lib/server/crypto";
import { mutate } from "@/lib/server/db";
import { fail, ok, readJson, str } from "@/lib/server/http";
import { currentAdmin } from "@/lib/server/session";

/** The signed-in admin edits their own name and password (the current password is required to change it). */
export async function PUT(req: Request) {
  const me = await currentAdmin();
  if (!me) return fail("forbidden", 401);
  const b = await readJson(req);
  if (!b) return fail("invalid_input");
  const name = str(b.name, 60);
  const current = typeof b.current === "string" ? b.current : "";
  const next = typeof b.password === "string" ? b.password : "";
  if (next && (next.length < 8 || next.length > 200)) return fail("weak_password");
  const res = await mutate((db) => {
    const a = db.admins.find((x) => x.id === me.id);
    if (!a) return "not_found";
    if (next) {
      if (!verifyPassword(current, a.passwordHash)) return "bad_credentials";
      a.passwordHash = hashPassword(next);
    }
    if (name) a.name = name;
    audit(db, a, "update", "profile", a.username, next ? "password changed" : "name changed");
    return "ok";
  });
  return res === "ok" ? ok() : fail(res, res === "not_found" ? 404 : 401);
}
