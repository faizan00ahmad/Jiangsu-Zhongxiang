import { SITE_DICT } from "@/i18n/site";
import CheckoutForm from "@/components/orders/CheckoutForm";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import { KIND_META } from "@/lib/catalog";
import { depositFor, priceQuote } from "@/lib/pricing";
import { factoryStatus, siteData } from "@/lib/server/queries";
import { currentUser, getLang } from "@/lib/server/session";

export async function generateMetadata() {
  return { title: SITE_DICT[await getLang()].checkout.title, robots: { index: false } };
}

export default async function Checkout({ params }: { params: Promise<{ quoteId: string }> }) {
  const { quoteId } = await params;
  const t = SITE_DICT[await getLang()];
  const user = await currentUser();
  if (!user) return <EmptyState title={t.checkout.title} text={t.checkout.loginNeeded} cta={{ href: `/login?next=/checkout/${quoteId}`, label: t.nav.login }} secondary={{ href: `/register?next=/checkout/${quoteId}`, label: t.nav.register }} />;
  const { db, colors } = await siteData();
  const quote = db.quotes.find((q) => q.id === quoteId && (q.userId === null || q.userId === user.id));
  const model = quote && db.models.find((m) => m.slug === quote.model && m.enabled);
  if (!quote || !model) return <EmptyState title={t.quote.notFound} cta={{ href: "/customize", label: t.home.ctaButton }} />;

  // priced against today's catalogue — the same numbers the server will charge
  const p = priceQuote(model, db.options, quote.config);
  const meta = KIND_META[model.kind];
  return (
    <>
      <PageHeader eyebrow={`${t.common.quoteNo} ${quote.id.slice(0, 8).toUpperCase()}`} title={t.checkout.title} text={t.checkout.intro} accent={meta.accent} glow={meta.glow} />
      <div style={{ ["--accent" as string]: meta.accent, ["--accent-rgb" as string]: meta.glow } as React.CSSProperties}>
        <CheckoutForm
          quoteId={quote.id}
          model={model}
          color={model.colors.find((c) => c.id === p.config.color)?.hex ?? colors[p.config.color ?? model.defaultColor] ?? "#ccc"}
          colorId={p.config.color}
          wheel={p.config.wheel}
          lines={p.lines}
          basePrice={model.basePrice}
          total={p.total}
          deposit={depositFor(p.total, db.settings.depositPercent)}
          depositPercent={db.settings.depositPercent}
          lockHours={db.settings.lockHours}
          stock={factoryStatus(db, model.slug).status}
          dealers={db.dealers.filter((d) => d.enabled)}
          me={{ name: user.name, phone: user.phone, city: user.city }}
        />
      </div>
    </>
  );
}
