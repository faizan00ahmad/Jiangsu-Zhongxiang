import { SITE_DICT } from "@/i18n/site";
import EmptyState from "@/components/EmptyState";
import OrderDetail from "@/components/orders/OrderDetail";
import { PICKUP_LOCK_STAGE } from "@/lib/catalog";
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
  // every open store with its live stock for this model; a store with none gets the unit with the customer's shipment
  const stores = db.dealers
    .filter((d) => d.enabled)
    .map((d) => {
      const q = d.stock[order.model] ?? 0;
      return { id: d.id, name: d.name, address: d.address, city: d.city, phone: d.phone, status: (q <= 0 ? "incoming" : q <= db.settings.lowStock ? "low" : "in") as "in" | "low" | "incoming" };
    });
  return <OrderDetail order={order} model={model} color={model.colors.find((c) => c.id === order.config.color)?.hex ?? colors[order.config.color ?? model.defaultColor] ?? "#ccc"} timeline={trackingView(db, order)} fresh={fresh} stores={stores} pickupLocked={order.stage >= PICKUP_LOCK_STAGE} myCity={order.contact.city} />;
}
