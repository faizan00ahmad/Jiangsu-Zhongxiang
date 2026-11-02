import type { DB, Post } from "../types";

/** What the public site may show and index, in one place so the sitemap, robots.txt, menus and admin previews always agree. */

export const livePosts = (db: DB, now = Date.now()): Post[] =>
  db.posts
    .filter((p) => p.status === "published" && (!p.publishAt || +new Date(p.publishAt) <= now))
    .sort((a, b) => +new Date(b.publishAt ?? b.createdAt) - +new Date(a.publishAt ?? a.createdAt));

export const POLICY_PATHS = ["returns", "privacy", "terms"];
export const pagePath = (slug: string) => (POLICY_PATHS.includes(slug) ? `/${slug}` : `/p/${slug}`);

export function sitemapPaths(db: DB): string[] {
  const paths = ["/", "/customize", "/inventory", "/tracking", "/blog", "/enquiry"];
  for (const m of db.models) if (m.enabled && !m.seo?.noindex) paths.push(`/customize/${m.slug}`);
  for (const p of db.pages) if (p.enabled && !p.seo?.noindex) paths.push(pagePath(p.slug));
  for (const p of livePosts(db)) if (!p.seo?.noindex) paths.push(`/blog/${p.slug}`);
  for (const d of db.dealers) if (d.enabled) paths.push(`/dealers/${d.id}`);
  return [...new Set(paths)];
}

export function robotsText(db: DB, origin: string): string {
  const lines = ["User-agent: *", "Allow: /", "Disallow: /admin", "Disallow: /api/", "Disallow: /account", "Disallow: /orders", "Disallow: /checkout", "Disallow: /quote"];
  if (db.settings.robotsExtra) lines.push(...db.settings.robotsExtra.split("\n").filter(Boolean));
  if (db.settings.sitemapEnabled !== false) lines.push("", `Sitemap: ${origin}/sitemap.xml`);
  return lines.join("\n") + "\n";
}
