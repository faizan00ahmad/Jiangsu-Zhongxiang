import PageDocView from "@/components/PageDocView";
import { loadPage, pageMetadata } from "@/lib/server/pages";

export const generateMetadata = () => pageMetadata("returns");

export default async function Policy() {
  const { page, lang } = await loadPage("returns");
  return <PageDocView page={page} lang={lang} />;
}