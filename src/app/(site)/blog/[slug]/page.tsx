import Link from "next/link";
import { notFound } from "next/navigation";
import { SITE_DICT } from "@/i18n/site";
import PageHeader from "@/components/PageHeader";
import { Markdown, plain } from "@/lib/markdown";
import { getDb, mutate } from "@/lib/server/db";
import { getLang } from "@/lib/server/session";
import { livePosts } from "@/lib/server/seo";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const lang = await getLang();
  const { slug } = await params;
  const p = livePosts(await getDb()).find((x) => x.slug === slug);
  if (!p) return {};
  return { title: p.seo?.title[lang] || p.title[lang] || p.title.en, description: p.seo?.description[lang] || p.excerpt[lang] || plain(p.body[lang] || p.body.en), robots: p.seo?.noindex ? { index: false, follow: false } : undefined, openGraph: { type: "article" as const, images: p.seo?.image || p.image ? [p.seo?.image || (p.image as string)] : undefined } };
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lang = await getLang();
  const t = SITE_DICT[lang].blog;
  const post = livePosts(await getDb()).find((x) => x.slug === slug);
  if (!post) notFound();
  await mutate((db) => {
    const p = db.posts.find((x) => x.id === post.id);
    if (p) p.views = (p.views ?? 0) + 1;
  });
  const body = post.body[lang].trim() ? post.body[lang] : post.body.en;
  return (
    <>
      <PageHeader eyebrow={new Date(post.publishAt ?? post.createdAt).toLocaleDateString(lang === "ur" ? "ur-PK" : "en-GB", { dateStyle: "long" })} title={post.title[lang] || post.title.en} text={post.excerpt[lang] || post.excerpt.en} />
      <article className="mx-auto max-w-3xl px-5 pb-16 text-[17px] text-ink/85">
        {post.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.image} alt="" className="mb-8 w-full rounded-3xl object-cover" />
        )}
        <Markdown text={body} />
        {post.tags.length > 0 && (
          <p className="mt-8 flex flex-wrap gap-2 text-xs">
            {post.tags.map((x) => (
              <span key={x} className="rounded-full bg-ink/[0.07] px-3 py-1">
                #{x}
              </span>
            ))}
          </p>
        )}
        <Link href="/blog" className="mt-10 inline-block text-sm font-semibold text-[var(--volt)]">
          ← {t.back}
        </Link>
      </article>
    </>
  );
}