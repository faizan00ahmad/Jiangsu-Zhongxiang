import { SITE_DICT } from "@/i18n/site";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import PayFlow from "@/components/pay/PayFlow";
import { getDb } from "@/lib/server/db";
import { enabledMethods } from "@/lib/server/gateways";
import { intentView, refreshIntent } from "@/lib/server/payments";
import { currentUser, getLang } from "@/lib/server/session";

export async function generateMetadata() {
  return { title: SITE_DICT[await getLang()].pay.title, robots: { index: false } };
}

export default async function PayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = SITE_DICT[await getLang()];
  const user = await currentUser();
  if (!user) return <EmptyState title={t.pay.title} text={t.errors.unauthorized} cta={{ href: `/login?next=/pay/${id}`, label: t.nav.login }} />;
  const db = await getDb();
  const found = db.payIntents.find((i) => i.id === id && i.userId === user.id);
  if (!found) return <EmptyState title={t.order.notFound} cta={{ href: "/orders", label: t.orders.title }} />;
  const copy = { ...found };
  refreshIntent(copy); // a timeout reads as such even before anyone has saved it
  const view = intentView(db, copy);
  // the orders can still be paid for while their reservation lasts
  const waiting = db.orders.filter((o) => found.orderIds.includes(o.id) && o.status === "pending_payment");
  const lockUntil = waiting.length === found.orderIds.length ? waiting.reduce((min, o) => (o.lockExpiresAt < min ? o.lockExpiresAt : min), waiting[0].lockExpiresAt) : null;
  return (
    <>
      <PageHeader eyebrow={t.nav.orders} title={t.pay.title} text="" accent="#16b364" glow="22,179,100" />
      <PayFlow initial={JSON.parse(JSON.stringify(view))} methods={enabledMethods(db)} lockUntil={lockUntil} />
    </>
  );
}
