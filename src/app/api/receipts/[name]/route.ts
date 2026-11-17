import { promises as fs } from "node:fs";
import path from "node:path";
import { UPLOAD_DIR, getDb } from "@/lib/server/db";
import { can, currentAdmin, currentUser } from "@/lib/server/session";

const TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp", pdf: "application/pdf" };

/** A bank transfer receipt. Private: shown only to the customer who sent it and to staff who may see payments. */
export async function GET(_req: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  const m = name.match(/^[A-Za-z0-9_-]{10,64}\.(png|jpg|webp|pdf)$/);
  if (!m) return new Response("Not found", { status: 404 });
  const db = await getDb();
  const intent = db.payIntents.find((i) => i.receipt === name);
  if (!intent) return new Response("Not found", { status: 404 });
  const admin = await currentAdmin();
  const user = await currentUser();
  const allowed = (admin && can(admin, "payments.view")) || (user && user.id === intent.userId);
  if (!allowed) return new Response("Not found", { status: 404 });
  try {
    const buf = await fs.readFile(path.join(UPLOAD_DIR, "receipts", name));
    return new Response(new Uint8Array(buf), { headers: { "content-type": TYPES[m[1]], "cache-control": "private, no-store", "x-content-type-options": "nosniff", "content-disposition": "inline", "content-security-policy": "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
