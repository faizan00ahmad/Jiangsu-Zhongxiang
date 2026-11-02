import { notFound } from "next/navigation";
import Configurator from "@/components/customize/Configurator";
import ModelReviews from "@/components/customize/ModelReviews";
import SimilarModels from "@/components/customize/SimilarModels";
import ViewPing from "@/components/customize/ViewPing";
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

  // only reviews staff have approved are shown; a customer's own pending one counts as "already reviewed"
  const reviews = db.reviews
    .filter((r) => r.model === model.slug && r.status === "approved")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 20)
    .map((r) => ({ id: r.id, name: r.name, rating: r.rating, title: r.title, body: r.body, at: r.createdAt }));
  const reviewed = !!user && db.reviews.some((r) => r.userId === user.id && r.model === model.slug && r.status !== "rejected");
  // staff-picked related models first, then others of the same type, never the model itself
  const picked = (model.related ?? []).map((s) => models.find((m) => m.slug === s)).filter((m): m is (typeof models)[number] => !!m && m.slug !== model.slug);
  const fill = models.filter((m) => m.kind === model.kind && m.slug !== model.slug && !picked.includes(m));
  const similar = [...picked, ...fill].slice(0, 3).map((m) => ({ slug: m.slug, kind: m.kind, variant: m.variant, name: m.name, image: m.image, photos: m.photos, colors: m.colors, basePrice: m.basePrice, color: colors[m.defaultColor] ?? m.colors?.[0]?.hex ?? "#ccc" }));
  return (
    <>
      <Configurator model={model} models={models} options={groupsFor(model, db.options)} colors={colors} initial={initial} fromQuote={quote ? quote.id : null} loggedIn={!!user} stock={factoryStatus(db, model.slug).status} />
      <ModelReviews slug={model.slug} reviews={reviews} signedIn={!!user} alreadyReviewed={reviewed} />
      <SimilarModels models={similar} />
      <ViewPing slug={model.slug} />
    </>
  );
}
