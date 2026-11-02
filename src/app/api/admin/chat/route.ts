import { audit, guard } from "@/lib/server/admin";
import { mutate } from "@/lib/server/db";
import { fail, ok, readJson, str } from "@/lib/server/http";

/** POST {id, text} → staff reply. PATCH {id, status?} → mark read, close or reopen. */
export async function POST(req: Request) {
  const g = await guard("chat.edit");
  if (g.res) return g.res;
  if (g.admin.scope === "dealer") return fail("forbidden", 403);
  const b = await readJson(req);
  const text = str(b?.text, 1000);
  if (!b || !text) return fail("invalid_input");
  const res = await mutate((db) => {
    const c = db.chats.find((x) => x.id === b.id);
    if (!c) return false;
    const now = new Date().toISOString();
    c.messages.push({ from: "admin", by: g.admin.name, text, at: now });
    c.unread = 0;
    c.updatedAt = now;
    audit(db, g.admin, "reply", "chat", c.id, text.slice(0, 60));
    return true;
  });
  return res ? ok() : fail("not_found", 404);
}

export async function PATCH(req: Request) {
  const g = await guard("chat.edit");
  if (g.res) return g.res;
  if (g.admin.scope === "dealer") return fail("forbidden", 403);
  const b = await readJson(req);
  if (!b) return fail("invalid_input");
  const res = await mutate((db) => {
    const c = db.chats.find((x) => x.id === b.id);
    if (!c) return false;
    c.unread = 0;
    if (b.status === "closed" || b.status === "open") c.status = b.status;
    return true;
  });
  return res ? ok() : fail("not_found", 404);
}
