import { SITE_DICT } from "@/i18n/site";
import CartView from "@/components/cart/CartView";
import PageHeader from "@/components/PageHeader";
import { siteData } from "@/lib/server/queries";
import { currentUser, getLang } from "@/lib/server/session";

export async function generateMetadata() {
  return { title: SITE_DICT[await getLang()].cart.title, robots: { index: false } };
}

export default async function CartPage() {
  const t = SITE_DICT[await getLang()];
  const user = await currentUser();
  const { db, colors } = await siteData();
  return (
    <>
      <PageHeader eyebrow={t.nav.orders} title={t.cart.title} text={t.cart.intro} accent="#16b364" glow="22,179,100" />
      <CartView
        models={db.models.map((m) => ({ slug: m.slug, kind: m.kind, variant: m.variant, name: m.name, image: m.image, photos: m.photos, colors: m.colors }))}
        colors={colors}
        zones={db.zones.filter((z) => z.enabled).map((z) => ({ name: z.name, cities: z.cities, baseCost: z.baseCost, extraDays: z.extraDays }))}
        myCity={user?.city ?? null}
      />
    </>
  );
}
