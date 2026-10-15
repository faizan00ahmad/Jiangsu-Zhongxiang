import { verifyPassword } from "@/lib/server/crypto";
import { getDb, mutate } from "@/lib/server/db";
import { clientIp, fail, normalizePhone, ok, readJson, throttled } from "@/lib/server/http";
import { publicUser, startUserSession } from "@/lib/server/session";
import { claimQuotes } from "../claim";

export async function POST(req: Request) {
  const b = await readJson(req);
  if (!b) return fail("invalid_input");
  const phone = normalizePhone(b.phone);
  const password = typeof b.password === "string" ? b.password : "";
  if (!phone) return fail("invalid_phone");
  if (throttled(`login:${clientIp(req)}:${phone}`)) return fail("too_many_attempts", 429);
  const user = (await getDb()).users.find((u) => u.phone === phone);
  if (!user || user.disabled || !verifyPassword(password, user.passwordHash)) return fail("bad_credentials", 401);
  if (Array.isArray(b.claim) && b.claim.length) await mutate((db) => claimQuotes(db, user.id, b.claim));
  await startUserSession(user.id);
  return ok({ user: publicUser(user) });
}
