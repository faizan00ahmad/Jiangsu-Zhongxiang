import { cookies } from "next/headers";
import { fail, ok, readJson } from "@/lib/server/http";
import { ADMIN_LANG_COOKIE } from "@/lib/server/session";

export async function POST(req: Request) {
  const b = await readJson(req);
  if (!b || (b.lang !== "zh" && b.lang !== "en")) return fail("invalid_input");
  (await cookies()).set(ADMIN_LANG_COOKIE, b.lang, { path: "/", maxAge: 31536000, sameSite: "lax" });
  return ok();
}
