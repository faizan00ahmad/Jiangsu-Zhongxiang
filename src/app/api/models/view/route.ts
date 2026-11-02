import { mutate } from "@/lib/server/db";
import { clientIp, fail, ok, readJson, sameOrigin, str, throttled } from "@/lib/server/http";

/** Counts one visit to a model page. The browser sends it once per model per tab session. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("invalid_input", 403);
  if (throttled(`view:${clientIp(req)}`, 120, 60 * 60 * 1000)) return fail("too_many_attempts", 429);
  const b = await readJson(req);
  const slug = str(b?.model, 60);
  if (!slug) return fail("invalid_input");
  const found = await mutate((db) => {
    const m = db.models.find((x) => x.slug === slug && x.enabled);
    if (!m) return false;
    m.views = (m.views ?? 0) + 1;
    return true;
  });
  return found ? ok() : fail("not_found", 404);
}
