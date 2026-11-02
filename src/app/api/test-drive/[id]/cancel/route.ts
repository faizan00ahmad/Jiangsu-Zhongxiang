import { mutate } from "@/lib/server/db";
import { fail, ok, sameOrigin } from "@/lib/server/http";
import { notify } from "@/lib/server/notify";
import { currentUser } from "@/lib/server/session";
import { whenText } from "@/lib/server/testdrive";

/** The customer cancels their own booking while it is still requested or confirmed. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return fail("forbidden", 403);
  const user = await currentUser();
  if (!user) return fail("unauthorized", 401);
  const { id } = await ctx.params;
  const res = await mutate((db) => {
    const t = db.testDrives.find((x) => x.id === id && x.userId === user.id);
    if (!t) return "not_found";
    if (t.status !== "requested" && t.status !== "confirmed") return "forbidden";
    t.status = "cancelled";
    t.history.push({ at: new Date().toISOString(), by: "customer", action: "cancelled" });
    const d = db.dealers.find((x) => x.id === t.dealerId);
    notify(db, "testdrive.cancelled", { name: t.name, phone: t.phone, email: user.email }, { store: d?.name.en ?? "", when: whenText(t.date, t.time) }, t.id);
    return "ok";
  });
  return res === "ok" ? ok() : fail(res, res === "not_found" ? 404 : 409);
}
