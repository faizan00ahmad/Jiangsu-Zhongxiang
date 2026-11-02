import { notFound } from "next/navigation";
import PrintButton from "@/components/admin/PrintButton";
import { CITIES, STAGES } from "@/lib/catalog";
import { pageGuard, visibleOrders } from "@/lib/server/admin";
import { getDb } from "@/lib/server/db";

const n = (v: number) => v.toLocaleString("en-US");

/** Printable invoice / order confirmation. "Print" → save as PDF in the browser. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const admin = await pageGuard("orders");
  const { id } = await params;
  const db = await getDb();
  const o = visibleOrders(db, admin).find((x) => x.id === id);
  if (!o) notFound();
  const u = db.users.find((x) => x.id === o.userId);
  const d = db.dealers.find((x) => x.id === o.contact.dealerId);
  const co = db.settings.company;
  const balance = o.total - (o.payment?.verified ? o.deposit : 0);
  return (
    <div className="mx-auto max-w-3xl rounded-2xl border border-ink/10 bg-white p-8 text-[#111] print:border-0 print:p-0" id="invoice">
      <div className="flex items-start justify-between gap-6 border-b border-black/10 pb-6">
        <div>
          <h1 className="text-2xl font-bold">{co?.name ?? "Evolta Bikes Zhongxiang"}</h1>
          <p className="mt-1 text-sm text-black/60">{co?.address.en}</p>
          <p className="text-sm text-black/60">
            {co?.phone} · {co?.email}
          </p>
        </div>
        <div className="text-end">
          <p className="text-xs uppercase tracking-widest text-black/45">Invoice</p>
          <p className="text-xl font-bold">{o.id}</p>
          <p className="text-sm text-black/60">{new Date(o.createdAt).toLocaleDateString("en-GB", { dateStyle: "long" })}</p>
        </div>
      </div>
      <div className="grid gap-6 py-6 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-widest text-black/45">Customer</p>
          <p className="font-semibold">{o.contact.name}</p>
          <p className="text-sm text-black/65">
            {o.contact.phone}
            {u?.email ? ` · ${u.email}` : ""}
          </p>
          <p className="text-sm text-black/65">{CITIES[o.contact.city].en}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-black/45">Pickup dealership</p>
          <p className="font-semibold">{d?.name.en}</p>
          <p className="text-sm text-black/65">{d?.address.en}</p>
          <p className="text-sm text-black/65">{d?.phone}</p>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-y border-black/10 text-xs uppercase tracking-wide text-black/50">
            <th className="py-2 text-start font-medium">Item</th>
            <th className="py-2 text-start font-medium">Choice</th>
            <th className="py-2 text-end font-medium">PKR</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-black/[0.07]">
            <td className="py-2 font-semibold">Vehicle</td>
            <td>{o.modelName}</td>
            <td className="text-end">{n(o.basePrice)}</td>
          </tr>
          {o.lines.map((l) => (
            <tr key={l.group} className="border-b border-black/[0.07]">
              <td className="py-2 text-black/65">{l.groupLabel.en}</td>
              <td>{l.label.en}</td>
              <td className="text-end">{l.price ? `+ ${n(l.price)}` : "—"}</td>
            </tr>
          ))}
          {!!o.discount && (
            <tr className="border-b border-black/[0.07]">
              <td className="py-2 text-black/65">Coupon</td>
              <td>{o.couponCode}</td>
              <td className="text-end">− {n(o.discount)}</td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr className="font-bold">
            <td className="pt-3" colSpan={2}>
              Total
            </td>
            <td className="pt-3 text-end">PKR {n(o.total)}</td>
          </tr>
          <tr>
            <td className="py-1 text-black/65" colSpan={2}>
              Advance ({o.depositPercent}%) {o.payment ? (o.payment.verified ? "· paid" : "· awaiting verification") : "· not paid yet"}
            </td>
            <td className="py-1 text-end">PKR {n(o.deposit)}</td>
          </tr>
          <tr className="font-semibold">
            <td colSpan={2}>Balance due at pickup</td>
            <td className="text-end">PKR {n(balance)}</td>
          </tr>
        </tfoot>
      </table>
      <p className="mt-6 text-xs text-black/55">
        Current step: {STAGES[o.stage].title.en}
        {o.eta ? ` · Estimated arrival ${new Date(o.eta).toLocaleDateString("en-GB", { dateStyle: "medium" })}` : ""}. This invoice is an order confirmation; prices are in Pakistani rupees.
      </p>
      <PrintButton />
    </div>
  );
}
