import { audit, guard } from "@/lib/server/admin";
import { CACHE_TAGS, bust, clearAll } from "@/lib/server/cache";
import { mutate } from "@/lib/server/db";
import { fail, ok, readJson } from "@/lib/server/http";

/** POST {} clears everything; POST {tag} clears one group (content, catalogue, currency, settings). */
export async function POST(req: Request) {
  const g = await guard("cache.edit");
  if (g.res) return g.res;
  const b = await readJson<{ tag?: string }>(req);
  if (!b) return fail("invalid_input");
  if (b.tag) {
    if (!(CACHE_TAGS as readonly string[]).includes(b.tag)) return fail("invalid_input");
    bust([b.tag], ["/"]);
  } else clearAll(g.admin.name);
  await mutate((db) => audit(db, g.admin, "clear", "cache", b.tag ?? "all", b.tag ? `cleared ${b.tag}` : "cleared everything"));
  return ok();
}
