import { SITE_DICT } from "@/i18n/site";
import EmptyState from "@/components/EmptyState";
import OrderDetail from "@/components/orders/OrderDetail";
import { siteData } from "@/lib/server/queries";
import { currentUser, getLang } from "@/lib/server/session";
import { trackingView } from "@/lib/server/views";

export async function generateMetadata() {
  return { title: SITE_DICT[await getLang()].order.title, robots: { index: false } };
}

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> }) {
  const { id } = await params;
  const fresh = (await searchParams).new === "1";
  const t = SITE_DICT[await getLang()];
  const user = await currentUser();
  if (!user) return <EmptyState title={t.orders.title} text={t.errors.unauthorized} cta={{ href: `/login?next=/orders/${id}`, label: t.nav.login }} />;
  const { db, colors } = await siteData();
  const order = db.orders.find((o) => o.id === id && o.userId === user.id);
  const model = order && db.models.find((m) => m.slug === order.model);
  if (!order || !model) return <EmptyState title={t.order.notFound} cta={{ href: "/orders", label: t.orders.title }} />;
  return <OrderDetail order={order} model={model} color={model.colors.find((c) => c.id === order.config.color)?.hex ?? colors[order.config.color ?? model.defaultColor] ?? "#ccc"} timeline={trackingView(db, order)} fresh={fresh} />;
}
