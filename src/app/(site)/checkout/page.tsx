import { redirect } from "next/navigation";
import { SITE_DICT } from "@/i18n/site";
import CheckoutFlow from "@/components/pay/CheckoutFlow";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import { depositFor } from "@/lib/pricing";
import { priceCart } from "@/lib/server/checkout";
import { enabledMethods } from "@/lib/server/gateways";
import { siteData } from "@/lib/server/queries";
import { currentUser, getLang } from "@/lib/server/session";

export async function generateMetadata() {
  return { title: SITE_DICT[await getLang()].checkout.title, robots: { index: false } };
}

export default async function Checkout() {
  const t = SITE_DICT[await getLang()];
  const user = await currentUser();
  if (!user) return <EmptyState title={t.checkout.title} text={t.checkout.loginNeeded} cta={{ href: "/login?next=/checkout", label: t.nav.login }} secondary={{ href: "/register?next=/checkout", label: t.nav.register }} />;
  const { db, colors } = await siteData();
  const view = priceCart(db, user.id, user.cart ?? []);
  if (!view.lines.length) redirect("/cart");
  const percent = db.settings.depositPercent;
  const deposit = view.lines.reduce((s, l) => s + (l.problem === "gone" || l.problem === "unavailable" ? 0 : depositFor(l.unit, percent) * l.qty), 0);
  return (
    <>
      <PageHeader eyebrow={t.nav.orders} title={t.checkout.title} text={t.checkout.intro} accent="#16b364" glow="22,179,100" />
      {view.ok ? (
        <CheckoutFlow
          view={JSON.parse(JSON.stringify(view))}
          models={db.models.map((m) => ({ slug: m.slug, kind: m.kind, variant: m.variant, name: m.name, image: m.image, photos: m.photos, colors: m.colors }))}
          colors={colors}
          zones={db.zones.filter((z) => z.enabled).map((z) => ({ name: z.name, cities: z.cities, baseCost: z.baseCost, extraDays: z.extraDays }))}
          methods={enabledMethods(db)}
          depositPercent={percent}
          deposit={deposit}
          lockHours={db.settings.lockHours}
          me={{ name: user.name, phone: user.phone, city: user.city }}
        />
      ) : (
        <EmptyState title={t.errors.cart_changed} cta={{ href: "/cart", label: t.cart.view }} />
      )}
    </>
  );
}
