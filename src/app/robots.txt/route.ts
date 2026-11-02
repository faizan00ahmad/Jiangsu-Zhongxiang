import { getDb } from "@/lib/server/db";
import { robotsText } from "@/lib/server/seo";

export async function GET(req: Request) {
  const db = await getDb();
  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  return new Response(robotsText(db, origin), { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=300" } });
}
