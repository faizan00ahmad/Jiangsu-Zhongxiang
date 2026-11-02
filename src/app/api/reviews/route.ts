import { randomId } from "@/lib/server/crypto";
import { mutate } from "@/lib/server/db";
import { clientIp, fail, ok, readJson, sameOrigin, str, throttled } from "@/lib/server/http";
import { currentUser } from "@/lib/server/session";

/** A signed-in customer rates a model. It waits as "pending" until staff approve it in the admin. One review per customer per model. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("invalid_input", 403);
  const user = await currentUser();
  if (!user) return fail("unauthorized", 401);
  if (throttled(`review:${clientIp(req)}`, 10, 60 * 60 * 1000)) return fail("too_many_attempts", 429);
  const b = await readJson(req);
  if (!b) return fail("invalid_input");
  const slug = str(b.model, 60);
  const rating = typeof b.rating === "number" ? Math.round(b.rating) : 0;
  const title = str(b.title, 100);
  const body = str(b.body, 1500);
  if (rating < 1 || rating > 5) return fail("rating_required");
  if (body.length < 10) return fail("review_short");
  const res = await mutate((db) => {
    if (!db.models.some((m) => m.slug === slug && m.enabled)) return "not_found";
    if (db.reviews.some((r) => r.userId === user.id && r.model === slug && r.status !== "rejected")) return "review_exists";
    db.reviews.push({ id: randomId(8), model: slug, userId: user.id, name: user.name.split(" ")[0] || user.name, rating, title, body, status: "pending", createdAt: new Date().toISOString() });
    return "ok";
  });
  if (res === "ok") return ok();
  return fail(res, res === "not_found" ? 404 : 409);
}
