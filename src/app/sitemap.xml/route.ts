import { getDb } from "@/lib/server/db";
import { sitemapPaths } from "@/lib/server/seo";

/** Built from the live data: models, pages, published posts and stores. Switched off in Admin > SEO. */
export async function GET(req: Request) {
  const db = await getDb();
  if (db.settings.sitemapEnabled === false) return new Response("Not found", { status: 404 });
  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const body = sitemapPaths(db)
    .map((p) => `<url><loc>${esc(origin + p)}</loc></url>`)
    .join("");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=300" } });
}
