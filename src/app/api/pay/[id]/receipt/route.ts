import { promises as fs } from "node:fs";
import path from "node:path";
import { randomId } from "@/lib/server/crypto";
import { UPLOAD_DIR, mutate } from "@/lib/server/db";
import { clientIp, fail, ok, sameOrigin, throttled } from "@/lib/server/http";
import { intentView, receiptArrived, refreshIntent } from "@/lib/server/payments";
import { currentUser } from "@/lib/server/session";

const MAX = 5 * 1024 * 1024;

/** The real type from the file's own bytes: never the name or the browser's claim. */
function sniff(b: Uint8Array) {
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "png";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "webp";
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return "pdf";
  return null;
}

/** POST multipart {file}: the bank transfer receipt (image or PDF, up to 5 MB). Kept out of the public folder; only the owner and staff can open it. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return fail("invalid_input", 403);
  const user = await currentUser();
  if (!user) return fail("unauthorized", 401);
  if (throttled(`receipt:${user.id}`, 10, 60 * 60 * 1000) || throttled(`receiptip:${clientIp(req)}`, 30, 60 * 60 * 1000)) return fail("too_many_attempts", 429);
  const { id } = await ctx.params;
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return fail("bad_file");
  if (file.size > MAX) return fail("file_too_large", 413);
  const buf = new Uint8Array(await file.arrayBuffer());
  const ext = sniff(buf);
  if (!ext) return fail("bad_file", 415);

  const name = `${randomId(14)}.${ext}`;
  const res = await mutate((db) => {
    const i = db.payIntents.find((x) => x.id === id && x.userId === user.id);
    if (!i) return { error: "not_found" };
    refreshIntent(i);
    const r = receiptArrived(db, i, name);
    return r.error ? { error: r.error } : { view: intentView(db, i) };
  });
  if ("error" in res) return fail(res.error ?? "invalid_input", res.error === "not_found" ? 404 : 409);
  // written after the attempt accepted it; a failed write would leave a review without a file, so it is checked
  try {
    await fs.mkdir(path.join(UPLOAD_DIR, "receipts"), { recursive: true });
    await fs.writeFile(path.join(UPLOAD_DIR, "receipts", name), buf);
  } catch {
    await mutate((db) => {
      const i = db.payIntents.find((x) => x.id === id);
      if (i && i.receipt === name) (i.receipt = null), (i.status = "created"), i.attempts.push({ at: new Date().toISOString(), result: "receipt_write_failed" });
    });
    return fail("server", 500);
  }
  return ok({ view: res.view });
}
