import PageDocView from "@/components/PageDocView";
import { loadPage, pageMetadata } from "@/lib/server/pages";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return pageMetadata((await params).slug);
}

export default async function CmsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { page, lang } = await loadPage((await params).slug);
  return <PageDocView page={page} lang={lang} />;
}