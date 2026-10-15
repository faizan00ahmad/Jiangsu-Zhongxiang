import { SITE_DICT } from "@/i18n/site";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import OrderCard from "@/components/orders/OrderCard";
import { Reveal } from "@/components/ui";
import { siteData } from "@/lib/server/queries";
import { currentUser, getLang } from "@/lib/server/session";

export async function generateMetadata() {
  return { title: SITE_DICT[await getLang()].orders.title };
}

export default async function Orders() {
  const t = SITE_DICT[await getLang()];
  const user = await currentUser();
  if (!user) return <EmptyState title={t.orders.title} text={t.errors.unauthorized} cta={{ href: "/login?next=/orders", label: t.nav.login }} secondary={{ href: "/register?next=/orders", label: t.nav.register }} />;
  const { db, colors } = await siteData();
  const orders = db.orders.filter((o) => o.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <>
      <PageHeader eyebrow={t.nav.orders} title={t.orders.title} text={t.orders.intro} accent="#3d8bff" glow="61,139,255" />
      <div className="mx-auto max-w-5xl space-y-4 px-5">
        {orders.length === 0 ? (
          <EmptyState title={t.orders.empty} cta={{ href: "/customize", label: t.orders.emptyCta }} />
        ) : (
          orders.map((o, i) => {
            const m = db.models.find((x) => x.slug === o.model);
            if (!m) return null;
            return (
              <Reveal key={o.id} delay={i * 0.06}>
                <OrderCard order={o} model={m} color={m.colors.find((c) => c.id === o.config.color)?.hex ?? colors[o.config.color ?? ""] ?? "#ccc"} />
              </Reveal>
            );
          })
        )}
      </div>
    </>
  );
}
