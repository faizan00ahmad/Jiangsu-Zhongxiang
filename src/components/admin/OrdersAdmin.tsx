"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { STAGES } from "@/lib/catalog";
import { dateTime, fill, n } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";
import { Download, Search } from "@/components/Icons";
import { useAdmin } from "./AdminProvider";
import { PageTitle, Pill, STATUS_COLOR, inputCls } from "./ui";

export type OrderRow = { id: string; modelName: string; customer: string; phone: string; dealer: string; status: OrderStatus; stage: number; total: number; deposit: number; verified: boolean | null; createdAt: string };

const STATUSES: OrderStatus[] = ["pending_payment", "active", "completed", "cancelled", "expired"];

export default function OrdersAdmin({ rows }: { rows: OrderRow[] }) {
  const { t, lang } = useAdmin();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [stage, setStage] = useState<number | "">("");
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => (!status || r.status === status) && (stage === "" || (r.status === "active" && r.stage === stage)) && (!s || [r.id, r.customer, r.phone, r.modelName].some((x) => x.toLowerCase().includes(s))));
  }, [rows, q, status, stage]);

  return (
    <>
      <PageTitle
        title={t.orders.title}
        intro={t.orders.intro}
        actions={
          <a href={`/api/admin/orders/export${status ? `?status=${status}` : ""}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--volt)] px-3.5 text-sm font-semibold text-black">
            <Download size={15} /> {t.orders.export}
          </a>
        }
      />
      <div className="mb-4 flex flex-wrap gap-3">
        <label className="relative min-w-[240px] flex-1">
          <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-ink/40" />
          <input className={`${inputCls} ps-9`} placeholder={t.orders.search} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t.common.search} />
        </label>
        <select className={`${inputCls} w-auto`} value={status} onChange={(e) => setStatus(e.target.value as OrderStatus | "")} aria-label={t.orders.status}>
          <option value="">
            {t.orders.status}: {t.common.all}
          </option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {t.orders.statuses[s]}
            </option>
          ))}
        </select>
        <select className={`${inputCls} w-auto`} value={stage} onChange={(e) => setStage(e.target.value === "" ? "" : Number(e.target.value))} aria-label={t.orders.stage}>
          <option value="">
            {t.orders.stage}: {t.common.all}
          </option>
          {STAGES.map((s, i) => (
            <option key={s.key} value={i}>
              {i + 1}. {s.title[lang]}
            </option>
          ))}
        </select>
      </div>
      <p className="mb-2 text-xs text-ink/50">{fill(t.orders.count, { n: list.length })}</p>
      <div className="overflow-x-auto rounded-2xl border border-ink/10 bg-card/70">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="border-b border-ink/10 text-xs text-ink/50">
            <tr>
              {[t.orders.id, t.orders.model, t.orders.customer, t.orders.dealer, t.orders.status, t.orders.current, t.orders.total, t.orders.deposit, t.orders.created].map((h, i) => (
                <th key={h} className={`px-4 py-3 font-medium ${i >= 6 ? "text-end" : "text-start"}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/[0.07]">
            {list.map((r) => (
              <tr key={r.id} className="hover:bg-ink/[0.03]">
                <td className="px-4 py-3">
                  <Link href={`/admin/orders/${r.id}`} className="font-semibold hover:text-[var(--volt)]">
                    {r.id}
                  </Link>
                </td>
                <td className="px-4">{r.modelName}</td>
                <td className="px-4">
                  {r.customer}
                  <span className="block text-xs text-ink/45">{r.phone}</span>
                </td>
                <td className="px-4 text-ink/70">{r.dealer}</td>
                <td className="px-4">
                  <Pill color={STATUS_COLOR[r.status]}>{t.orders.statuses[r.status]}</Pill>
                </td>
                <td className="px-4 text-ink/70">{r.status === "active" ? STAGES[r.stage].title[lang] : "—"}</td>
                <td className="px-4 text-end tabular-nums">{n(r.total)}</td>
                <td className="px-4 text-end tabular-nums">
                  {n(r.deposit)}
                  {r.verified !== null && <span className={`block text-xs ${r.verified ? "text-[var(--volt)]" : "text-[var(--amber)]"}`}>{r.verified ? t.orders.verified : t.orders.unverified}</span>}
                </td>
                <td className="px-4 text-end text-ink/55">{dateTime(r.createdAt, lang)}</td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-ink/45">
                  {t.orders.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
