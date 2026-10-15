import { SITE_DICT } from "@/i18n/site";
import QuoteView from "@/components/quote/QuoteView";
import EmptyState from "@/components/EmptyState";
import { siteData } from "@/lib/server/queries";
import { currentUser, getLang } from "@/lib/server/session";

export async function generateMetadata() {
  return { title: SITE_DICT[await getLang()].quote.title, robots: { index: false } };
}

/** Anyone with the (unguessable) link can view a quotation — that's what makes it shareable. Names show only to the owner. */
export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = SITE_DICT[await getLang()];
  const { db, colors } = await siteData();
  const quote = db.quotes.find((q) => q.id === id);
  const model = quote && db.models.find((m) => m.slug === quote.model);
  if (!quote || !model) return <EmptyState title={t.quote.notFound} cta={{ href: "/customize", label: t.home.ctaButton }} />;
  const user = await currentUser();
  return <QuoteView quote={quote} model={model} color={model.colors.find((c) => c.id === quote.config.color)?.hex ?? colors[quote.config.color ?? model.defaultColor] ?? "#ccc"} depositPercent={db.settings.depositPercent} preparedFor={user && quote.userId === user.id ? user.name : null} />;
}
