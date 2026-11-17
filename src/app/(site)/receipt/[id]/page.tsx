import { SITE_DICT } from "@/i18n/site";
import EmptyState from "@/components/EmptyState";
import PrintReceipt from "@/components/pay/PrintReceipt";
import { dateTime, pkr } from "@/lib/format";
import { balanceDue } from "@/lib/pricing";
import { getDb } from "@/lib/server/db";
import { METHOD_NAME } from "@/lib/server/payments";
import { currentUser, getLang } from "@/lib/server/session";

export async function generateMetadata() {
  return { title: SITE_DICT[await getLang()].pay.receipt.title, robots: { index: false } };
}

/** A printable receipt for a payment that went through. Only the customer who paid can open it. */
export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lang = await getLang();
  const t = SITE_DICT[lang];
  const user = await currentUser();
  if (!user) return <EmptyState title={t.pay.receipt.title} text={t.errors.unauthorized} cta={{ href: `/login?next=/receipt/${id}`, label: t.nav.login }} />;
  const db = await getDb();
  const intent = db.payIntents.find((i) => i.id === id && i.userId === user.id && i.status === "succeeded");
  if (!intent) return <EmptyState title={t.order.notFound} cta={{ href: "/orders", label: t.orders.title }} />;
  const orders = db.orders.filter((o) => intent.orderIds.includes(o.id));
  const when = orders[0]?.payment?.paidAt ?? intent.updatedAt;
  const channel = intent.channel.last4 ? `${intent.channel.brand} ····${intent.channel.last4}` : (intent.channel.wallet ?? "");
  return (
    <div className="mx-auto max-w-2xl px-5 pb-24 pt-32 md:pt-40">
      <div className="rounded-3xl border border-ink/15 bg-white p-8 text-[#111]">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-black/50">{t.brand.name} {t.brand.sub}</p>
        <h1 className="font-display mt-2 text-3xl font-bold">{t.pay.receipt.title}</h1>
        <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-black/50">{t.pay.receipt.paidOn}</dt><dd className="font-semibold">{dateTime(when, lang)}</dd></div>
          <div><dt className="text-black/50">{t.pay.receipt.reference}</dt><dd className="latin font-mono font-semibold">{intent.ref}</dd></div>
          <div><dt className="text-black/50">{t.pay.receipt.method}</dt><dd className="font-semibold">{METHOD_NAME[intent.method]}{channel ? ` · ${channel}` : ""}</dd></div>
          <div><dt className="text-black/50">{t.pay.receipt.paid}</dt><dd className="font-semibold">{pkr(intent.amount, lang)}</dd></div>
        </dl>
        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-y border-black/10 text-xs uppercase tracking-wide text-black/50">
              <th className="py-2 text-start font-medium">{t.pay.receipt.orders}</th>
              <th className="py-2 text-end font-medium">{t.pay.receipt.total}</th>
              <th className="py-2 text-end font-medium">{t.pay.receipt.paid}</th>
              <th className="py-2 text-end font-medium">{t.pay.receipt.balance}</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-black/[0.07]">
                <td className="py-2"><span className="latin font-mono text-xs">{o.id}</span><br />{o.modelName}</td>
                <td className="py-2 text-end">{pkr(o.total, lang)}</td>
                <td className="py-2 text-end">{pkr(o.payment?.amount ?? 0, lang)}</td>
                <td className="py-2 text-end">{pkr(balanceDue(o), lang)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-6 text-xs text-black/55">{t.pay.receipt.note}</p>
      </div>
      <div className="no-print mt-6 flex justify-center">
        <PrintReceipt />
      </div>
    </div>
  );
}
