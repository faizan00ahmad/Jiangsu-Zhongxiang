import { fail, ok, sameOrigin } from "@/lib/server/http";
import { endAdminSession } from "@/lib/server/session";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("forbidden", 403);
  await endAdminSession();
  return ok();
}
