"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { LAST_STAGE, STAGES } from "@/lib/catalog";
import { daysBetween, fill } from "@/lib/format";
import { Arrow } from "@/components/Icons";
import { useAdmin } from "./AdminProvider";
import { PageTitle } from "./ui";

type Item = { id: string; modelName: string; customer: string; stage: number; since: string | null; trackingNo: string | null; verified: boolean };

/** Kanban of in-progress orders by cross-border node; one click moves an order to the next node. */
export default function LogisticsBoard({ items }: { items: Item[] }) {
  const { t, lang, call } = useAdmin();
  const now = new Date().toISOString();
  return (
    <>
      <PageTitle title={t.logistics.title} intro={t.logistics.intro} />
      <div className="-mx-4 overflow-x-auto px-4 pb-4 md:-mx-8 md:px-8">
        <div className="flex min-w-max gap-3">
          {STAGES.slice(1).map((s, k) => {
            const stage = k + 1;
            const col = items.filter((i) => i.stage === stage);
            return (
              <section key={s.key} className="w-64 shrink-0 rounded-2xl border border-ink/10 bg-card/60">
                <header className="flex items-center justify-between border-b border-ink/10 px-3 py-2.5">
                  <h2 className="text-sm font-semibold">
                    {stage + 1}. {s.title[lang]}
                  </h2>
                  <span className="rounded-full bg-ink/10 px-2 text-xs tabular-nums">{col.length}</span>
                </header>
                <ul className="space-y-2 p-2">
                  {col.map((o) => (
                    <motion.li layout key={o.id} className="rounded-xl border border-ink/10 bg-bg/60 p-3 text-sm">
                      <Link href={`/admin/orders/${o.id}`} className="font-semibold hover:text-[var(--volt)]">
                        {o.id}
                      </Link>
                      <p className="text-xs text-ink/60">
                        {o.modelName} · {o.customer}
                      </p>
                      {o.trackingNo && <p className="mt-1 text-[11px] text-ink/45">{o.trackingNo}</p>}
                      <p className="mt-1 text-[11px] text-ink/45">⏱ {o.since ? fill(lang === "zh" ? "{n} 天" : "{n} days", { n: daysBetween(o.since, now) }) : "—"}</p>
                      {stage < LAST_STAGE && (
                        <button onClick={() => call(`/api/admin/orders/${o.id}`, { action: "stage", stage: stage + 1 }, "PATCH")} className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-lg bg-ink/[0.07] py-1.5 text-xs font-semibold hover:bg-[var(--volt)] hover:text-black">
                          {t.logistics.next} <Arrow size={12} />
                        </button>
                      )}
                    </motion.li>
                  ))}
                  {col.length === 0 && <li className="py-6 text-center text-xs text-ink/35">{t.common.noData}</li>}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}
