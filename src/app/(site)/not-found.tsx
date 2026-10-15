import { SITE_DICT } from "@/i18n/site";
import EmptyState from "@/components/EmptyState";
import { getLang } from "@/lib/server/session";

export default async function NotFound() {
  const t = SITE_DICT[await getLang()];
  return <EmptyState title={t.notFound.title} text={t.notFound.text} cta={{ href: "/", label: t.notFound.home }} />;
}
