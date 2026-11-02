import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { plain } from "../markdown";
import type { Lang, PageDoc } from "../types";
import { getDb } from "./db";
import { getLang } from "./session";

/** Looks up a published CMS page by slug (404 otherwise) and builds its metadata. Shared by /p/[slug], /returns, /privacy and /terms. */
export async function loadPage(slug: string): Promise<{ page: PageDoc; lang: Lang }> {
  const db = await getDb();
  const page = db.pages.find((p) => p.slug === slug && p.enabled);
  if (!page) notFound();
  return { page, lang: await getLang() };
}

export async function pageMetadata(slug: string): Promise<Metadata> {
  const db = await getDb();
  const lang = await getLang();
  const page = db.pages.find((p) => p.slug === slug && p.enabled);
  if (!page) return {};
  const seo = page.seo;
  return {
    title: seo?.title[lang] || page.title[lang] || page.title.en,
    description: seo?.description[lang] || plain(page.body[lang] || page.body.en),
    robots: seo?.noindex ? { index: false, follow: false } : undefined,
    openGraph: seo?.image ? { images: [seo.image] } : undefined,
  };
}
