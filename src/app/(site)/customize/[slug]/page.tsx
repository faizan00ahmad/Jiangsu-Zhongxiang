import { notFound } from "next/navigation";
import Configurator from "@/components/customize/Configurator";
import { groupsFor, normalizeConfig } from "@/lib/pricing";
import { factoryStatus, siteData } from "@/lib/server/queries";
import { currentUser } from "@/lib/server/session";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { models } = await siteData();
  return { title: models.find((x) => x.slug === slug)?.name };
}

export default async function CustomizeModel({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const { db, models, colors } = await siteData();
  const model = models.find((m) => m.slug === slug);
  if (!model) notFound();
  const user = await currentUser();

  // "Modify configuration" from a saved quotation, else whatever is in the URL
  const qid = typeof sp.q === "string" ? sp.q : null;
  const quote = qid ? db.quotes.find((q) => q.id === qid && (q.userId === null || q.userId === user?.id)) : undefined;
  const flat = Object.fromEntries(Object.entries(sp).filter(([, v]) => typeof v === "string")) as Record<string, string>;
  const initial = normalizeConfig(model, db.options, quote && quote.model === model.slug ? quote.config : flat);

  return <Configurator model={model} models={models} options={groupsFor(model, db.options)} colors={colors} initial={initial} fromQuote={quote ? quote.id : null} loggedIn={!!user} stock={factoryStatus(db, model.slug).status} />;
}
