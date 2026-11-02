import PageDocView from "@/components/PageDocView";
import { loadPage, pageMetadata } from "@/lib/server/pages";

export const generateMetadata = () => pageMetadata("terms");

export default async function Policy() {
  const { page, lang } = await loadPage("terms");
  return <PageDocView page={page} lang={lang} />;
}