"use client";
import { useMemo, useState } from "react";
import { CITIES } from "@/lib/catalog";
import { date, fill } from "@/lib/format";
import type { CityKey } from "@/lib/types";
import { Search } from "@/components/Icons";
import { useAdmin } from "./AdminProvider";
import { Btn, PageTitle, Pill, inputCls } from "./ui";

type Row = { id: string; name: string; phone: string; email: string | null; city: CityKey; createdAt: string; disabled: boolean; orders: number; quotes: number };

export default function UsersAdmin({ rows }: { rows: Row[] }) {
  const { t, lang, call } = useAdmin();
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => !s || [r.name, r.phone, r.email ?? "", CITIES[r.city].en, CITIES[r.city].zh].some((x) => x.toLowerCase().includes(s)));
  }, [rows, q]);
  return (
    <>
      <PageTitle title={t.users.title} intro={t.users.intro} />
      <label className="relative mb-4 block max-w-md">
        <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-ink/40" />
        <input className={`${inputCls} ps-9`} placeholder={`${t.users.name} / ${t.users.phone} / ${t.users.city}`} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t.common.search} />
      </label>
      <p className="mb-2 text-xs text-ink/50">{fill(lang === "zh" ? "共 {n} 位用户" : "{n} users", { n: list.length })}</p>
      <div className="overflow-x-auto rounded-2xl border border-ink/10 bg-card/70">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="border-b border-ink/10 text-xs text-ink/50">
            <tr>
              {[t.users.name, t.users.phone, t.users.email, t.users.city, t.users.registered, t.users.orders, t.users.quotes, t.common.status, ""].map((h, i) => (
                <th key={i} className="px-4 py-3 text-start font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/[0.07]">
            {list.map((r) => (
              <tr key={r.id} className={r.disabled ? "opacity-55" : ""}>
                <td className="px-4 py-3 font-semibold">{r.name}</td>
                <td className="px-4 tabular-nums">{r.phone}</td>
                <td className="px-4 text-ink/60">{r.email ?? "—"}</td>
                <td className="px-4">{CITIES[r.city][lang]}</td>
                <td className="px-4 text-ink/60">{date(r.createdAt, lang)}</td>
                <td className="px-4 tabular-nums">{r.orders}</td>
                <td className="px-4 tabular-nums">{r.quotes}</td>
                <td className="px-4">
                  <Pill color={r.disabled ? "#8b93a3" : "#2ee6a6"}>{r.disabled ? t.common.disabled : t.common.enabled}</Pill>
                </td>
                <td className="px-4 text-end">
                  <Btn tone="ghost" onClick={() => call(`/api/admin/users/${r.id}`, { disabled: !r.disabled }, "PATCH")}>
                    {r.disabled ? t.users.enable : t.users.disable}
                  </Btn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
