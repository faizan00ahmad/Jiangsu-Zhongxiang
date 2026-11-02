import { headers } from "next/headers";
import { SeoAdmin } from "@/components/admin/SystemScreens";
import { pageGuard } from "@/lib/server/admin";
import { getDb } from "@/lib/server/db";
import { pagePath, robotsText, sitemapPaths } from "@/lib/server/seo";

export default async function Page() {
  await pageGuard("seo");
  const db = await getDb();
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const gaps = [
    ...db.models.filter((m) => m.enabled && !m.seo?.description.en).map((m) => ({ kind: "Model", name: m.name, href: "/admin/models" })),
    ...db.pages.filter((p) => p.enabled && !p.seo?.description.en).map((p) => ({ kind: "Page", name: `${p.title.en} (${pagePath(p.slug)})`, href: "/admin/pages" })),
    ...db.posts.filter((p) => p.status === "published" && !p.seo?.description.en).map((p) => ({ kind: "Post", name: p.title.en, href: "/admin/posts" })),
  ];
  return <SeoAdmin settings={db.settings} sitemap={sitemapPaths(db).map((p) => origin + p)} robots={robotsText(db, origin)} gaps={gaps} />;
}