import { isCity } from "@/lib/catalog";
import { hashPassword, randomId } from "@/lib/server/crypto";
import { mutate } from "@/lib/server/db";
import { clientIp, fail, normalizePhone, ok, readJson, str, throttled } from "@/lib/server/http";
import { publicUser, startUserSession } from "@/lib/server/session";
import type { User } from "@/lib/types";
import { claimQuotes } from "../claim";

export async function POST(req: Request) {
  const b = await readJson(req);
  if (!b) return fail("invalid_input");
  const name = str(b.name, 80);
  const phone = normalizePhone(b.phone);
  const password = typeof b.password === "string" ? b.password : "";
  const email = str(b.email, 120) || null;
  if (!name) return fail("name_required");
  if (!phone) return fail("invalid_phone");
  if (password.length < 8 || password.length > 200) return fail("weak_password");
  if (!isCity(b.city)) return fail("invalid_input");
  const city = b.city;
  if (throttled(`reg:${clientIp(req)}`, 10)) return fail("too_many_attempts", 429);

  const passwordHash = hashPassword(password);
  const user = await mutate((db) => {
    if (db.users.some((u) => u.phone === phone)) return null;
    const u: User = { id: randomId(8), name, phone, email, city, passwordHash, createdAt: new Date().toISOString(), disabled: false };
    db.users.push(u);
    claimQuotes(db, u.id, b.claim);
    return u;
  });
  if (!user) return fail("phone_taken", 409);
  await startUserSession(user.id);
  return ok({ user: publicUser(user) });
}
