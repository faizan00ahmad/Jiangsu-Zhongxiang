import { audit, guard } from "@/lib/server/admin";
import { bust } from "@/lib/server/cache";
import { mutate } from "@/lib/server/db";
import { fail, ok, readJson, str } from "@/lib/server/http";

const lang = (v: unknown, n: number) => {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  return { en: str(o.en, n), ur: str(o.ur, n) };
};

/** Site-wide SEO defaults, sitemap switch and extra robots.txt lines. */
export async function PUT(req: Request) {
  const g = await guard("seo.edit");
  if (g.res) return g.res;
  const b = await readJson(req);
  if (!b) return fail("invalid_input");
  const d = (b.defaultSeo && typeof b.defaultSeo === "object" ? b.defaultSeo : {}) as Record<string, unknown>;
  const image = str(d.image, 300);
  await mutate((db) => {
    db.settings.defaultSeo = { title: lang(d.title, 120), description: lang(d.description, 300), image: /^\/(api\/files|products|hero)\//.test(image) ? image : null, noindex: d.noindex === true };
    db.settings.sitemapEnabled = b.sitemapEnabled !== false;
    // only plain robots.txt directive lines: nothing that could smuggle markup or break the file
    db.settings.robotsExtra = String(b.robotsExtra ?? "")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => /^(Allow|Disallow|Crawl-delay|Sitemap|User-agent):\s?[\w/*.$?=&:%-]*$/i.test(l))
      .slice(0, 40)
      .join("\n");
    audit(db, g.admin, "update", "seo", "settings", "default SEO / sitemap / robots");
  });
  bust(["settings", "content"], ["/", "/sitemap.xml", "/robots.txt"]);
  return ok();
}
