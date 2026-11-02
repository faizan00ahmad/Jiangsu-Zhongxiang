import { getDb } from "@/lib/server/db";
import { fail, ok } from "@/lib/server/http";
import { slotsFor } from "@/lib/server/testdrive";

/** GET ?dealer=&model=&date=YYYY-MM-DD → the free places for that store and day. Public, read-only. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const db = await getDb();
  const d = db.dealers.find((x) => x.id === q.get("dealer"));
  const model = q.get("model") ?? "";
  if (!d || !model) return fail("invalid_input");
  return ok({ slots: slotsFor(db, d, model, q.get("date") ?? "") });
}
