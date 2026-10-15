import { promises as fs } from "node:fs";
import path from "node:path";
import { guard } from "@/lib/server/admin";
import { randomId } from "@/lib/server/crypto";
import { UPLOAD_DIR } from "@/lib/server/db";
import { fail, ok, sameOrigin } from "@/lib/server/http";

const MAX = 5 * 1024 * 1024;

/** Sniffs the real file type from its bytes (never trusts the name or the browser's MIME). SVG is refused. */
function sniff(b: Uint8Array) {
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "png";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "webp";
  return null;
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("forbidden", 403);
  const g = await guard("models");
  if (g.res) return g.res;
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return fail("bad_file");
  if (file.size > MAX) return fail("file_too_large", 413);
  const buf = new Uint8Array(await file.arrayBuffer());
  const ext = sniff(buf);
  if (!ext) return fail("bad_file", 415);
  const name = `${randomId(12)}.${ext}`;
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, name), buf);
  return ok({ url: `/api/files/${name}` });
}
