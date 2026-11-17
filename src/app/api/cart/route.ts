import { addToCart, cartItems, priceCart, removeFromCart, setCartQty } from "@/lib/server/checkout";
import { getDb, mutate } from "@/lib/server/db";
import { fail, ok, readJson, sameOrigin, str } from "@/lib/server/http";
import { currentUser } from "@/lib/server/session";
import { QUOTE_ID_MAX } from "@/lib/quoteKey";

/** The signed-in customer's cart. Guests keep theirs in the browser and use /api/cart/price. The browser only ever sends ids and quantities. */
export async function GET() {
  const user = await currentUser();
  if (!user) return fail("unauthorized", 401);
  const db = await getDb();
  const u = db.users.find((x) => x.id === user.id);
  const items = u ? cartItems(u) : [];
  return ok({ items, view: priceCart(db, user.id, items) });
}

async function change(run: (u: NonNullable<Awaited<ReturnType<typeof getDb>>["users"][number]>, db: Awaited<ReturnType<typeof getDb>>) => string) {
  const user = await currentUser();
  if (!user) return fail("unauthorized", 401);
  const res = await mutate((db) => {
    const u = db.users.find((x) => x.id === user.id);
    if (!u) return { r: "unauthorized", items: [] };
    const r = run(u, db);
    return { r, items: cartItems(u) };
  });
  if (res.r !== "ok") return fail(res.r, res.r === "not_found" ? 404 : res.r === "unauthorized" ? 401 : 409);
  return ok({ items: res.items });
}

/** POST {quoteId, qty?, replace?}: add a build. `replace` empties the cart first ("buy now"). */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("invalid_input", 403);
  const b = await readJson(req);
  const quoteId = str(b?.quoteId, QUOTE_ID_MAX);
  if (!b || !quoteId) return fail("invalid_input");
  const qty = typeof b.qty === "number" ? b.qty : 1;
  return change((u, db) => addToCart(db, u, quoteId, qty, b.replace === true));
}

/** PATCH {id, qty} */
export async function PATCH(req: Request) {
  if (!sameOrigin(req)) return fail("invalid_input", 403);
  const b = await readJson(req);
  const id = str(b?.id, 20);
  if (!b || !id || typeof b.qty !== "number") return fail("invalid_input");
  const qty = b.qty;
  return change((u) => setCartQty(u, id, qty));
}

/** DELETE {id?}: one line, or the whole cart when no id is given. */
export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return fail("invalid_input", 403);
  const b = await readJson(req);
  const id = str(b?.id, 20);
  return change((u) => {
    if (id) removeFromCart(u, id);
    else u.cart = [];
    return "ok";
  });
}
