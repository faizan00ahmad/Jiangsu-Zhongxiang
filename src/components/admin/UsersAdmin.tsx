"use client";
import Link from "next/link";
import { useState } from "react";
import { CITIES } from "@/lib/catalog";
import { date, dateTime, n } from "@/lib/format";
import type { CityKey, OrderStatus } from "@/lib/types";
import { useAdmin } from "./AdminProvider";
import DataTable, { type Col } from "./kit/DataTable";
import Modal from "./kit/Modal";
import { Btn, PageTitle, Pill, STATUS_COLOR } from "./ui";

type Row = { id: string; name: string; phone: string; email: string | null; city: CityKey; createdAt: string; disabled: boolean; orders: number; quotes: number; provider: string | null };
export type UserDetail = { orders: { id: string; model: string; status: OrderStatus; total: number; at: string }[]; quotes: { id: string; model: string; total: number; label: string | null; at: string }[]; wishlist: string[] };

export default function UsersAdmin({ rows, detail }: { rows: Row[]; detail: Record<string, UserDetail> }) {
  const { t, k, lang, call, can, confirm } = useAdmin();
  const [open, setOpen] = useState<Row | null>(null);
  const edit = can("users.edit");
  const cols: Col<Row>[] = [
    { key: "name", header: t.users.name, value: (r) => r.name, render: (r) => <span className="font-semibold">{r.name}</span> },
    { key: "phone", header: t.users.phone, value: (r) => r.phone, render: (r) => <span className="latin tabular-nums">{r.phone}</span> },
    { key: "email", header: t.users.email, value: (r) => r.email ?? "", className: "text-ink/60" },
    { key: "city", header: t.users.city, value: (r) => CITIES[r.city][lang], render: (r) => CITIES[r.city][lang] },
    { key: "provider", header: lang === "zh" ? "登录方式" : "Sign-in", value: (r) => r.provider ?? "phone", defaultHidden: true, render: (r) => <Pill color="#8b93a3">{r.provider ?? (lang === "zh" ? "手机号" : "Phone")}</Pill> },
    { key: "createdAt", header: t.users.registered, value: (r) => r.createdAt, render: (r) => <span className="text-ink/60">{date(r.createdAt, lang)}</span> },
    { key: "orders", header: t.users.orders, value: (r) => r.orders, render: (r) => <span className="latin tabular-nums">{r.orders}</span> },
    { key: "quotes", header: t.users.quotes, value: (r) => r.quotes, render: (r) => <span className="latin tabular-nums">{r.quotes}</span> },
    { key: "status", header: t.common.status, value: (r) => (r.disabled ? 0 : 1), render: (r) => <Pill color={r.disabled ? "#8b93a3" : "#2ee6a6"}>{r.disabled ? t.common.disabled : t.common.enabled}</Pill> },
  ];
  const d = open ? detail[open.id] : null;
  return (
    <>
      <PageTitle title={t.users.title} intro={t.users.intro} />
      <DataTable
        id="users"
        rows={rows}
        rowId={(r) => r.id}
        columns={cols}
        onRow={setOpen}
        defaultSort={{ key: "createdAt", dir: "desc" }}
        filters={[
          { key: "city", label: t.users.city, options: Object.keys(CITIES).map((c) => ({ value: c, label: CITIES[c as CityKey][lang] })), value: (r) => r.city },
          { key: "status", label: t.common.status, options: [{ value: "on", label: t.common.enabled }, { value: "off", label: t.common.disabled }], value: (r) => (r.disabled ? "off" : "on") },
        ]}
        exportBase={can("users.export") ? "/api/admin/users/export" : undefined}
        bulk={
          edit
            ? [
                { label: t.users.disable, danger: true, run: async (ids) => void (await Promise.all(ids.map((id) => call(`/api/admin/users/${id}`, { disabled: true }, "PATCH", true)))) },
                { label: t.users.enable, confirm: false, run: async (ids) => void (await Promise.all(ids.map((id) => call(`/api/admin/users/${id}`, { disabled: false }, "PATCH", true)))) },
              ]
            : []
        }
      />
      <Modal
        open={!!open}
        onClose={() => setOpen(null)}
        title={open?.name ?? ""}
        wide
        footer={
          open && edit ? (
            <Btn
              tone={open.disabled ? "primary" : "danger"}
              onClick={async () => {
                if (!open.disabled && !(await confirm(lang === "zh" ? "停用该用户？" : "Disable this customer?"))) return;
                if (await call(`/api/admin/users/${open.id}`, { disabled: !open.disabled }, "PATCH")) setOpen(null);
              }}
            >
              {open.disabled ? t.users.enable : t.users.disable}
            </Btn>
          ) : undefined
        }
      >
        {open && d && (
          <div className="space-y-6 text-sm">
            <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-ink/45">{t.users.phone}</dt>
                <dd className="latin">{open.phone}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink/45">{t.users.email}</dt>
                <dd>{open.email ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink/45">{t.users.city}</dt>
                <dd>{CITIES[open.city][lang]}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink/45">{t.users.registered}</dt>
                <dd>{date(open.createdAt, lang)}</dd>
              </div>
            </dl>
            <section>
              <h3 className="mb-2 font-semibold">
                {t.users.orders} ({d.orders.length})
              </h3>
              {d.orders.length === 0 ? (
                <p className="text-ink/45">—</p>
              ) : (
                <ul className="divide-y divide-ink/10">
                  {d.orders.map((o) => (
                    <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <Link href={`/admin/orders/${o.id}`} className="latin font-semibold hover:text-[var(--volt)]">
                        {o.id}
                      </Link>
                      <span>{o.model}</span>
                      <Pill color={STATUS_COLOR[o.status]}>{t.orders.statuses[o.status]}</Pill>
                      <span className="latin tabular-nums">PKR {n(o.total)}</span>
                      <span className="text-xs text-ink/45">{dateTime(o.at, lang)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section>
              <h3 className="mb-2 font-semibold">
                {t.users.quotes} ({d.quotes.length})
              </h3>
              {d.quotes.length === 0 ? (
                <p className="text-ink/45">—</p>
              ) : (
                <ul className="divide-y divide-ink/10">
                  {d.quotes.slice(0, 12).map((q) => (
                    <li key={q.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <a href={`/quote/${q.id}`} target="_blank" rel="noreferrer" className="latin font-mono text-xs hover:text-[var(--volt)]">
                        {q.id}
                      </a>
                      <span>
                        {q.model}
                        {q.label ? ` · ${q.label}` : ""}
                      </span>
                      <span className="latin tabular-nums">PKR {n(q.total)}</span>
                      <span className="text-xs text-ink/45">{dateTime(q.at, lang)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section>
              <h3 className="mb-2 font-semibold">{lang === "zh" ? "收藏车型" : "Wishlist"}</h3>
              <p className="text-ink/65">{d.wishlist.length ? d.wishlist.join(", ") : k.form.none}</p>
            </section>
          </div>
        )}
      </Modal>
    </>
  );
}
