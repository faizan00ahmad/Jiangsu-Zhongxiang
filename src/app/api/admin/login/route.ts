import { verifyPassword } from "@/lib/server/crypto";
import { getDb } from "@/lib/server/db";
import { clientIp, fail, ok, readJson, str, throttled } from "@/lib/server/http";
import { startAdminSession } from "@/lib/server/session";

export async function POST(req: Request) {
  const b = await readJson(req);
  if (!b) return fail("invalid_input");
  const username = str(b.username, 60).toLowerCase();
  const password = typeof b.password === "string" ? b.password : "";
  if (throttled(`admin:${clientIp(req)}:${username}`, 6)) return fail("too_many_attempts", 429);
  const a = (await getDb()).admins.find((x) => x.username === username);
  if (!a || a.disabled || !verifyPassword(password, a.passwordHash)) return fail("bad_credentials", 401);
  await startAdminSession(a.id);
  return ok();
}
