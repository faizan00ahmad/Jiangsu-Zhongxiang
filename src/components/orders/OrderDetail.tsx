"use client";
import { useI18n } from "@/i18n/I18nProvider";
import { CITIES, KIND_META } from "@/lib/catalog";
import { dateTime, fill, pkr, signedPkr } from "@/lib/format";
import type { Order } from "@/lib/types";
import ModelVisual, { type VisualModel } from "@/components/vehicle/ModelVisual";
import { Notice, Reveal } from "@/components/ui";
import { Phone, Pin, Shield, Store } from "@/components/Icons";
import Timeline, { StatusChip, type TimelineData } from "./Timeline";
import PayPanel from "./PayPanel";

export default function OrderDetail({ order, model, color, timeline, fresh }: { order: Order; model: VisualModel; color: string; timeline: TimelineData; fresh: boolean }) {
  const { t, tx, lang } = useI18n();
  const meta = KIND_META[model.kind];
  const dealer = timeline.dealer;
  return (
    <div className="mx-auto max-w-7xl px-5 pb-10 pt-32 md:pt-36" style={{ ["--accent" as string]: meta.accent, ["--accent-rgb" as string]: meta.glow } as React.CSSProperties}>
      {fresh && order.status === "pending_payment" && (
        <Notice tone="ok" className="mb-6">
          {t.order.created} · <span className="latin">{order.id}</span>
        </Notice>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-ink/50">{t.common.orderNo}</p>
          <h1 className="font-display latin-d text-3xl font-semibold md:text-5xl">{order.id}</h1>
          <p className="mt-2 text-sm text-ink/55">{dateTime(order.createdAt, lang)}</p>
        </div>
        <StatusChip status={order.status} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_400px]">
        <div className="space-y-8">
          {order.status === "pending_payment" && <PayPanel orderId={order.id} deposit={order.deposit} lockExpiresAt={order.lockExpiresAt} />}
          {(order.status === "cancelled" || order.status === "expired") && <Notice tone="error">{t.order.status[order.status]}</Notice>}
          <Reveal>
            <section className="glass rounded-3xl p-5 md:p-8">
              <h2 className="font-display mb-5 text-2xl font-semibold">{t.nav.tracking}</h2>
              <Timeline data={timeline} />
            </section>
          </Reveal>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
          <div className="glass overflow-hidden rounded-3xl">
            <div className="stage px-4 pt-4">
              <ModelVisual model={model} color={color} colorId={order.config.color} wheel={order.config.wheel} reflection={false} className="aspect-[1000/560] w-full rounded-xl" />
            </div>
            <div className="p-6">
              <p className="font-display latin-d text-2xl font-semibold">{order.modelName}</p>
              <h3 className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-ink/50">{t.order.config}</h3>
              <ul className="mt-2 space-y-1.5 text-sm">
                <li className="flex justify-between gap-3">
                  <span className="text-ink/60">{t.common.basePrice}</span>
                  <span>{pkr(order.basePrice, lang)}</span>
                </li>
                {order.lines.map((l) => (
                  <li key={l.group} className="flex justify-between gap-3">
                    <span className="text-ink/60">
                      {tx(l.groupLabel)}: {tx(l.label)}
                    </span>
                    <span className={l.price ? "" : "text-ink/40"}>{signedPkr(l.price, lang)}</span>
                  </li>
                ))}
              </ul>
              <div className="my-4 border-t border-ink/10" />
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <dt className="font-semibold">{t.common.total}</dt>
                  <dd className="font-display text-xl font-bold">{pkr(order.total, lang)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink/60">
                    {t.common.deposit} ({order.depositPercent}%)
                  </dt>
                  <dd>{pkr(order.deposit, lang)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink/60">{t.common.balance}</dt>
                  <dd>{pkr(order.total - order.deposit, lang)}</dd>
                </div>
              </dl>
              {order.payment && (
                <div className="mt-4 rounded-2xl bg-[var(--volt)]/10 p-3 text-sm">
                  <p className="flex items-center gap-2 font-semibold">
                    <Shield size={16} className="text-[var(--volt)]" />
                    {t.order.paid}
                  </p>
                  <p className="mt-1 text-ink/60">
                    {t.order.methods[order.payment.method]} · <span className="latin">{fill(t.order.paidRef, { ref: order.payment.ref })}</span>
                  </p>
                  <p className="text-ink/60">{order.payment.verified ? t.order.verified : t.order.awaitingVerify}</p>
                </div>
              )}
            </div>
          </div>

          {dealer && (
            <div className="glass rounded-3xl p-6 text-sm">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-ink/50">{t.order.pickup}</h3>
              <p className="mt-2 flex items-center gap-2 font-semibold">
                <Store size={16} className="text-[var(--accent)]" />
                {tx(dealer.name)}
              </p>
              <p className="mt-2 flex gap-2 text-ink/60">
                <Pin size={14} className="mt-1 shrink-0" />
                {tx(dealer.address)} · {tx(CITIES[dealer.city])}
              </p>
              <a href={`tel:${dealer.phone.replace(/\s/g, "")}`} className="latin mt-1 flex items-center gap-2 text-ink/60 hover:text-ink">
                <Phone size={14} />
                <span dir="ltr">{dealer.phone}</span>
              </a>
              <h3 className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-ink/50">{t.order.contact}</h3>
              <p className="mt-2">{order.contact.name}</p>
              <p className="latin text-ink/60" dir="ltr">{order.contact.phone}</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
