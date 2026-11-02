import { mutate } from "@/lib/server/db";
import { fail, ok, readJson, sameOrigin, str } from "@/lib/server/http";
import { currentUser } from "@/lib/server/session";

const MAX = 50;

/** POST {model, on} saves or removes one model from the signed-in customer's wishlist. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("invalid_input", 403);
  const user = await currentUser();
  if (!user) return fail("unauthorized", 401);
  const b = await readJson(req);
  const slug = str(b?.model, 60);
  if (!b || !slug) return fail("invalid_input");
  const res = await mutate((db) => {
    if (!db.models.some((m) => m.slug === slug && m.enabled)) return null;
    const u = db.users.find((x) => x.id === user.id);
    if (!u) return null;
    const list = (u.wishlist ??= []);
    const i = list.indexOf(slug);
    if (b.on === false) {
      if (i >= 0) list.splice(i, 1);
    } else if (i < 0) {
      list.unshift(slug);
      if (list.length > MAX) list.length = MAX;
    }
    return [...list];
  });
  return res ? ok({ list: res }) : fail("not_found", 404);
}
