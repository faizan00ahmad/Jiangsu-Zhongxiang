import { guard } from "@/lib/server/admin";
import { fail, ok, readJson } from "@/lib/server/http";
import { getDb } from "@/lib/server/db";

type Check = { id: string; ok: boolean; note?: string };
type PageReport = { path: string; status: number; ms: number; kb: number; checks: Check[] };

const strip = (h: string) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, "");

/** Fetches one page of this site and runs the same basic checks a validator or SEO audit starts with. */
function audit(html: string, path: string): Check[] {
  const body = strip(html);
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.trim() ?? "";
  const desc = /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i.exec(html)?.[1] ?? "";
  const h1 = (body.match(/<h1[\s>]/gi) ?? []).length;
  const imgs = body.match(/<img\b[^>]*>/gi) ?? [];
  const noAlt = imgs.filter((i) => !/\balt=/i.test(i)).length;
  const levels = [...body.matchAll(/<h([1-6])[\s>]/gi)].map((m) => Number(m[1]));
  const skips = levels.some((l, i) => i > 0 && l - levels[i - 1] > 1);
  const ids = [...body.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dupIds = ids.length - new Set(ids).size;
  const isAdmin = path.startsWith("/admin");
  return [
    { id: "doctype", ok: /^\s*<!doctype html>/i.test(html) },
    { id: "lang", ok: /<html[^>]+\blang=/i.test(html) },
    { id: "viewport", ok: /<meta[^>]+name=["']viewport["']/i.test(html) },
    { id: "charset", ok: /<meta[^>]+charset/i.test(html) },
    { id: "title", ok: title.length >= 10 && title.length <= 70, note: `${title.length} chars` },
    { id: "description", ok: isAdmin || (desc.length >= 50 && desc.length <= 170), note: `${desc.length} chars` },
    { id: "h1", ok: h1 === 1, note: `${h1} h1` },
    { id: "headings", ok: !skips, note: skips ? "a heading level is skipped" : "" },
    { id: "alt", ok: noAlt === 0, note: `${noAlt} of ${imgs.length} images without alt` },
    { id: "ids", ok: dupIds === 0, note: `${dupIds} duplicate ids` },
    { id: "canonical", ok: isAdmin || /<link[^>]+rel=["']canonical["']/i.test(html) },
    { id: "og", ok: isAdmin || /<meta[^>]+property=["']og:title["']/i.test(html) },
  ];
}

/** POST {} → report on the public pages plus data-quality checks. Takes a few seconds. */
export async function POST(req: Request) {
  const g = await guard("health.view");
  if (g.res) return g.res;
  if (!(await readJson(req))) return fail("invalid_input");
  const origin = new URL(req.url).origin;
  const db = await getDb();
  const paths = ["/", "/customize", `/customize/${db.models.find((m) => m.enabled)?.slug ?? ""}`, "/inventory", "/tracking", "/blog", "/enquiry", ...db.pages.filter((p) => p.enabled).slice(0, 6).map((p) => (["returns", "privacy", "terms"].includes(p.slug) ? `/${p.slug}` : `/p/${p.slug}`))];
  const pages: PageReport[] = [];
  for (const path of [...new Set(paths)]) {
    const t0 = Date.now();
    try {
      const r = await fetch(origin + path, { headers: { "x-health-check": "1" }, redirect: "manual", cache: "no-store" });
      const html = await r.text();
      pages.push({ path, status: r.status, ms: Date.now() - t0, kb: Math.round(html.length / 1024), checks: r.status === 200 ? audit(html, path) : [] });
    } catch {
      pages.push({ path, status: 0, ms: Date.now() - t0, kb: 0, checks: [] });
    }
  }
  const sitemap = await fetch(`${origin}/sitemap.xml`, { cache: "no-store" }).then((r) => r.status).catch(() => 0);
  const robots = await fetch(`${origin}/robots.txt`, { cache: "no-store" }).then((r) => r.status).catch(() => 0);

  const now = Date.now();
  const data: Check[] = [
    { id: "models_photo", ok: db.models.filter((m) => m.enabled && !(m.image || m.photos?.thumb)).length === 0, note: db.models.filter((m) => m.enabled && !(m.image || m.photos?.thumb)).map((m) => m.name).join(", ") },
    { id: "models_seo", ok: db.models.filter((m) => m.enabled && !m.seo?.description.en).length === 0, note: `${db.models.filter((m) => m.enabled && !m.seo?.description.en).length} listed models use the default description` },
    { id: "categories_empty", ok: db.categories.filter((c) => c.enabled && !db.models.some((m) => m.enabled && m.series === c.slug)).length === 0, note: db.categories.filter((c) => c.enabled && !db.models.some((m) => m.enabled && m.series === c.slug)).map((c) => c.name.en).join(", ") },
    { id: "pages_urdu", ok: db.pages.filter((p) => p.enabled && !p.body.ur.trim()).length === 0, note: db.pages.filter((p) => p.enabled && !p.body.ur.trim()).map((p) => p.slug).join(", ") },
    { id: "banners_live", ok: db.banners.some((b) => b.enabled && b.placement === "home" && (!b.start || +new Date(b.start) <= now) && (!b.end || +new Date(b.end) >= now)), note: "no home banner is live" },
    { id: "coupons_expired", ok: db.coupons.filter((c) => c.enabled && c.end && +new Date(c.end) < now).length === 0, note: "expired coupons still switched on" },
    { id: "currency_rates", ok: db.currencies.every((c) => c.rate > 0), note: "a currency has no rate" },
    { id: "unverified_payments", ok: db.orders.filter((o) => o.payment && !o.payment.verified && o.status !== "cancelled").length === 0, note: `${db.orders.filter((o) => o.payment && !o.payment.verified && o.status !== "cancelled").length} payments waiting for verification` },
    { id: "sitemap", ok: sitemap === 200 || db.settings.sitemapEnabled === false, note: `status ${sitemap}` },
    { id: "robots", ok: robots === 200, note: `status ${robots}` },
    { id: "integrations", ok: db.integrations.payments.jazzcash.mode === "live" || db.integrations.payments.easypaisa.mode === "live", note: "payments are still in sandbox mode" },
  ];
  return ok({ pages, data, at: new Date().toISOString() });
}
