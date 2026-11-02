import { cookies } from "next/headers";
import { randomId } from "@/lib/server/crypto";
import { getDb, mutate } from "@/lib/server/db";
import { clientIp, fail, ok, readJson, str, throttled } from "@/lib/server/http";
import { currentUser } from "@/lib/server/session";

const COOKIE = "zx_chat";
const cookieOpts = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 };

/** GET → this visitor's conversation (found by a private cookie) plus the widget settings. Polled while the widget is open. */
export async function GET() {
  const db = await getDb();
  const id = (await cookies()).get(COOKIE)?.value;
  const chat = id ? db.chats.find((c) => c.id === id) : undefined;
  return ok({ enabled: db.integrations.chat.enabled, welcome: db.integrations.chat.welcome, messages: (chat?.messages ?? []).map((m) => ({ from: m.from, text: m.text, at: m.at })), status: chat?.status ?? "open" });
}

/** POST {text} → a visitor message. Starts the conversation on the first one. */
export async function POST(req: Request) {
  const b = await readJson(req);
  const text = str(b?.text, 1000);
  if (!b || !text) return fail("invalid_input");
  if (throttled(`chat:${clientIp(req)}`, 30, 5 * 60 * 1000)) return fail("too_many_attempts", 429);
  const jar = await cookies();
  const user = await currentUser();
  const res = await mutate((db) => {
    if (!db.integrations.chat.enabled) return null;
    const now = new Date().toISOString();
    let chat = db.chats.find((c) => c.id === jar.get(COOKIE)?.value);
    if (!chat) {
      chat = { id: randomId(8), visitor: clientIp(req), userId: user?.id ?? null, name: user?.name ?? str(b.name, 60) ?? "", status: "open", messages: [], unread: 0, createdAt: now, updatedAt: now };
      db.chats.push(chat);
    }
    if (user && !chat.userId) {
      chat.userId = user.id;
      chat.name = user.name;
    }
    chat.status = "open";
    chat.messages.push({ from: "visitor", by: chat.name || "Visitor", text, at: now });
    if (chat.messages.length > 300) chat.messages.splice(0, chat.messages.length - 300);
    chat.unread += 1;
    chat.updatedAt = now;
    return chat.id;
  });
  if (!res) return fail("forbidden", 403);
  jar.set(COOKIE, res, cookieOpts);
  return ok();
}
