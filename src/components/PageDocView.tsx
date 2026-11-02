import { Markdown } from "@/lib/markdown";
import PageHeader from "@/components/PageHeader";
import type { Lang, PageDoc } from "@/lib/types";

/** A CMS page (About, policies…) in the visitor's language, falling back to English when the Urdu text is empty. */
export default function PageDocView({ page, lang }: { page: PageDoc; lang: Lang }) {
  const body = page.body[lang].trim() ? page.body[lang] : page.body.en;
  return (
    <>
      <PageHeader eyebrow={new Date(page.updatedAt).toLocaleDateString(lang === "ur" ? "ur-PK" : "en-GB", { dateStyle: "long" })} title={page.title[lang] || page.title.en} />
      <article className="mx-auto max-w-3xl px-5 pb-16 text-[17px] text-ink/85">
        <Markdown text={body} />
      </article>
    </>
  );
}
