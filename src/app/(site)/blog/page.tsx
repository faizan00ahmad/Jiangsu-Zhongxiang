import Link from "next/link";
import { SITE_DICT } from "@/i18n/site";
import PageHeader from "@/components/PageHeader";
import { getDb } from "@/lib/server/db";
import { getLang } from "@/lib/server/session";
import { livePosts } from "@/lib/server/seo";

export async function generateMetadata() {
  const t = SITE_DICT[await getLang()].blog;
  return { title: t.title, description: t.intro };
}

export default async function BlogIndex() {
  const lang = await getLang();
  const t = SITE_DICT[lang].blog;
  const posts = livePosts(await getDb());
  return (
    <>
      <PageHeader eyebrow={t.eyebrow} title={t.title} text={t.intro} />
      <div className="mx-auto grid max-w-6xl gap-6 px-5 pb-16 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((p) => (
          <Link key={p.id} href={`/blog/${p.slug}`} className="glass group block overflow-hidden rounded-3xl transition hover:-translate-y-1">
            {p.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.image} alt="" className="aspect-[16/9] w-full object-cover" loading="lazy" />
            ) : (
              <div className="grid aspect-[16/9] place-items-center bg-gradient-to-br from-[#e6f9f0] to-[#dbe7ff] text-4xl">⚡</div>
            )}
            <div className="p-6">
              <p className="text-xs text-ink/50">{new Date(p.publishAt ?? p.createdAt).toLocaleDateString(lang === "ur" ? "ur-PK" : "en-GB", { dateStyle: "medium" })}</p>
              <h2 className="font-display mt-1 text-xl font-semibold group-hover:text-[var(--volt)]">{p.title[lang] || p.title.en}</h2>
              <p className="mt-2 text-sm text-ink/65">{p.excerpt[lang] || p.excerpt.en}</p>
              <p className="mt-4 text-sm font-semibold text-[var(--volt)]">{t.read} →</p>
            </div>
          </Link>
        ))}
        {posts.length === 0 && <p className="text-ink/55 sm:col-span-3">{t.none}</p>}
      </div>
    </>
  );
}