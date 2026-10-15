"use client";
import { motion } from "framer-motion";
import { useI18n } from "@/i18n/I18nProvider";
import { CITIES, LAST_STAGE, STAGES } from "@/lib/catalog";
import { date, dateTime, daysBetween, fill } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";
import { Check, Clock, Ship, Store } from "@/components/Icons";
import { ease } from "@/components/ui";

export type TimelineData = {
  status: OrderStatus;
  stage: number;
  stageTimes: (string | null)[];
  eta: string | null;
  trackingNo: string | null;
  carrier: string | null;
  paidAt: string | null;
  dealer: { name: { en: string; ur: string }; city: keyof typeof CITIES; address: { en: string; ur: string }; phone: string } | null;
};

const STATUS_TONE: Record<OrderStatus, string> = { pending_payment: "#f5b40c", active: "#2ee6a6", completed: "#3d8bff", cancelled: "#8b93a3", expired: "#ff4d3d" };

export function StatusChip({ status }: { status: OrderStatus }) {
  const { t } = useI18n();
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-card/60 px-3 py-1 text-xs font-semibold">
      <span className="h-2 w-2 rounded-full" style={{ background: STATUS_TONE[status] }} />
      {t.order.status[status]}
    </span>
  );
}

/** The eight cross-border nodes with reached time, time spent per node, current node and ETA. */
export default function Timeline({ data }: { data: TimelineData }) {
  const { t, tx, lang } = useI18n();
  const dead = data.status === "cancelled" || data.status === "expired";
  const now = new Date().toISOString();
  const progress = dead ? 0 : data.stage / LAST_STAGE;
  const summary = [
    { l: t.order.current, v: data.status === "completed" ? t.order.status.completed : tx(STAGES[data.stage].title), I: Clock },
    { l: t.order.inTransit, v: data.paidAt ? fill(t.common.days, { n: daysBetween(data.paidAt, now) }) : "—", I: Clock },
    { l: t.order.eta, v: data.eta ? date(data.eta, lang) : "—", I: Store },
    { l: t.order.trackingNo, v: data.trackingNo ?? "—", I: Ship, latin: true, sub: data.carrier },
  ];
  return (
    <div>
      <dl className="grid gap-px overflow-hidden rounded-2xl border border-ink/10 bg-ink/10 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map((s) => (
          <div key={s.l} className="bg-card/80 p-4">
            <dt className="flex items-center gap-1.5 text-xs text-ink/55">
              <s.I size={14} />
              {s.l}
            </dt>
            <dd className={`mt-1 font-semibold ${s.latin ? "latin" : ""}`}>{s.v}</dd>
            {s.sub && <dd className="latin mt-0.5 text-xs text-ink/50">{s.sub}</dd>}
          </div>
        ))}
      </dl>

      <div className="relative mt-6 h-1.5 overflow-hidden rounded-full bg-ink/10" aria-hidden>
        <motion.div className="absolute inset-y-0 start-0 rounded-full bg-gradient-to-r from-[var(--volt)] to-[var(--blue)]" initial={{ width: 0 }} whileInView={{ width: `${Math.max(progress, 0.03) * 100}%` }} viewport={{ once: true }} transition={{ duration: 1.4, ease }} />
        {!dead && progress < 1 && <span className="pulse-rail absolute inset-0" />}
      </div>

      <ol className="relative mt-8">
        {STAGES.map((s, i) => {
          const finished = data.status === "completed";
          const done = !dead && (finished || i < data.stage);
          const current = !dead && !finished && i === data.stage;
          const reached = data.stageTimes[i];
          const next = data.stageTimes[i + 1];
          const spent = reached && next ? daysBetween(reached, next) : null;
          return (
            <motion.li key={s.key} initial={{ opacity: 0, x: lang === "ur" ? 24 : -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06, duration: 0.6, ease }} className="relative flex gap-4 pb-7 last:pb-0">
              {i < STAGES.length - 1 && <span className={`absolute start-[17px] top-9 h-[calc(100%-2.25rem)] w-[2px] ${i < data.stage && !dead ? "bg-[var(--volt)]" : "bg-ink/12"}`} />}
              <span
                className={`relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 text-xs font-bold ${
                  done ? "border-[var(--volt)] bg-[var(--volt)] text-black" : current ? "ping-dot border-[var(--volt)] bg-bg text-[var(--volt)]" : "border-ink/20 bg-bg text-ink/40"
                }`}
              >
                {done ? <Check size={16} /> : <span className="latin">{i + 1}</span>}
              </span>
              <div className={`min-w-0 flex-1 rounded-2xl border p-4 ${current ? "border-[var(--volt)]/50 bg-[var(--volt)]/[0.07]" : "border-ink/10"}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className={`font-semibold ${!done && !current ? "text-ink/55" : ""}`}>
                    {tx(s.title)}
                    {current && <span className="ms-2 rounded-full bg-[var(--volt)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black">{t.order.current}</span>}
                  </h3>
                  <span className="text-xs text-ink/55">{reached ? `${t.order.stageTime} ${dateTime(reached, lang)}` : t.order.pending}</span>
                </div>
                <p className="mt-1 text-sm text-ink/60">{tx(s.detail)}</p>
                {spent !== null && spent > 0 && <p className="mt-2 text-xs text-ink/45">⏱ {spent === 1 ? t.common.day : fill(t.common.days, { n: spent })}</p>}
                {i === LAST_STAGE && data.dealer && (
                  <p className="mt-2 text-sm">
                    <span className="text-ink/55">{t.order.pickup}: </span>
                    {tx(data.dealer.name)} · {tx(CITIES[data.dealer.city])}
                  </p>
                )}
              </div>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
