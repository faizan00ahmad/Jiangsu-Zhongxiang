import { guard } from "@/lib/server/admin";
import { mutate } from "@/lib/server/db";
import { fail, ok, readJson } from "@/lib/server/http";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guard("users");
  if (g.res) return g.res;
  const b = await readJson(req);
  if (!b || typeof b.disabled !== "boolean") return fail("invalid_input");
  const { id } = await ctx.params;
  const res = await mutate((db) => {
    const u = db.users.find((x) => x.id === id);
    if (!u) return false;
    u.disabled = b.disabled as boolean;
    return true;
  });
  return res ? ok() : fail("not_found", 404);
}
