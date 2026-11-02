"use client";
import { STAGES } from "@/lib/catalog";
import { dateTime, n } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";
import { useAdmin } from "./AdminProvider";
import DataTable, { type Col } from "./kit/DataTable";
import { PageTitle, Pill, STATUS_COLOR } from "./ui";

export type OrderRow = { id: string; modelName: string; customer: string; phone: string; dealer: string; status: OrderStatus; stage: number; total: number; deposit: number; verified: boolean | null; coupon: string | null; createdAt: string };

const STATUSES: OrderStatus[] = ["pending_payment", "active", "completed", "cancelled", "expired"];

export default function OrdersAdmin({ rows }: { rows: OrderRow[] }) {
  const { t, k, lang, can } = useAdmin();
  const cols: Col<OrderRow>[] = [
    { key: "id", header: t.orders.id, value: (r) => r.id, render: (r) => <span className="latin font-semibold">{r.id}</span> },
    { key: "model", header: t.orders.model, value: (r) => r.modelName },
    {
      key: "customer",
      header: t.orders.customer,
      value: (r) => `${r.customer} ${r.phone}`,
      render: (r) => (
        <>
          {r.customer}
          <span className="latin block text-xs text-ink/45">{r.phone}</span>
        </>
      ),
    },
    { key: "dealer", header: t.orders.dealer, value: (r) => r.dealer, className: "text-ink/70" },
    { key: "status", header: t.orders.status, value: (r) => t.orders.statuses[r.status], render: (r) => <Pill color={STATUS_COLOR[r.status]}>{t.orders.statuses[r.status]}</Pill> },
    { key: "stage", header: t.orders.current, value: (r) => (r.status === "active" ? r.stage : -1), render: (r) => <span className="text-ink/70">{r.status === "active" ? STAGES[r.stage].title[lang] : "—"}</span> },
    { key: "total", header: t.orders.total, value: (r) => r.total, render: (r) => <span className="latin tabular-nums">{n(r.total)}</span>, className: "text-end" },
    {
      key: "deposit",
      header: t.orders.deposit,
      value: (r) => r.deposit,
      className: "text-end",
      render: (r) => (
        <span className="latin tabular-nums">
          {n(r.deposit)}
          {r.verified !== null && <span className={`block text-xs ${r.verified ? "text-[var(--volt)]" : "text-[var(--amber)]"}`}>{r.verified ? t.orders.verified : t.orders.unverified}</span>}
        </span>
      ),
    },
    { key: "coupon", header: k.modules.coupons, value: (r) => r.coupon ?? "", defaultHidden: true, render: (r) => <span className="latin">{r.coupon ?? "—"}</span> },
    { key: "created", header: t.orders.created, value: (r) => r.createdAt, render: (r) => <span className="text-ink/55">{dateTime(r.createdAt, lang)}</span>, className: "text-end" },
  ];
  const exp = can("orders.export");
  return (
    <>
      <PageTitle title={t.orders.title} intro={t.orders.intro} />
      <DataTable
        id="orders"
        rows={rows}
        rowId={(r) => r.id}
        columns={cols}
        rowHref={(r) => `/admin/orders/${r.id}`}
        defaultSort={{ key: "created", dir: "desc" }}
        filters={[
          { key: "status", label: t.orders.status, options: STATUSES.map((s) => ({ value: s, label: t.orders.statuses[s] })), value: (r) => r.status },
          { key: "stage", label: t.orders.stage, options: STAGES.map((s, i) => ({ value: String(i), label: `${i + 1}. ${s.title[lang]}` })), value: (r) => (r.status === "active" ? String(r.stage) : "") },
          { key: "dealer", label: t.orders.dealer, options: [...new Set(rows.map((r) => r.dealer))].map((d) => ({ value: d, label: d })), value: (r) => r.dealer },
        ]}
        exportBase={exp ? "/api/admin/orders/export" : undefined}
      />
    </>
  );
}
