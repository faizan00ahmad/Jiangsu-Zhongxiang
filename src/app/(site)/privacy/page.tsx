import PageDocView from "@/components/PageDocView";
import { loadPage, pageMetadata } from "@/lib/server/pages";

export const generateMetadata = () => pageMetadata("privacy");

export default async function Policy() {
  const { page, lang } = await loadPage("privacy");
  return <PageDocView page={page} lang={lang} />;
}