import { fail, ok, sameOrigin } from "@/lib/server/http";
import { endUserSession } from "@/lib/server/session";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("invalid_input", 403);
  await endUserSession();
  return ok();
}
