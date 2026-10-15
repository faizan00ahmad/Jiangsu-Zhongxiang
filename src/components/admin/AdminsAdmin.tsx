"use client";
import { useState } from "react";
import { ROLE_ACCESS } from "@/lib/roles";
import { date } from "@/lib/format";
import type { AdminRole } from "@/lib/types";
import { useAdmin } from "./AdminProvider";
import { Btn, Card, Field, PageTitle, Pill, inputCls } from "./ui";

type Row = { id: string; username: string; name: string; role: AdminRole; dealerId: string | null; createdAt: string; disabled: boolean };
const ROLE_COLOR: Record<AdminRole, string> = { super: "#ff4d3d", operator: "#3d8bff", dealer: "#f5b40c" };

export default function AdminsAdmin({ rows, dealers }: { rows: Row[]; dealers: { id: string; name: string }[] }) {
  const { t, lang, me, call } = useAdmin();
  const [f, setF] = useState({ username: "", name: "", role: "operator" as AdminRole, dealerId: dealers[0]?.id ?? "", password: "" });
  const [reset, setReset] = useState<{ id: string; pw: string } | null>(null);
  return (
    <>
      <PageTitle title={t.admins.title} intro={t.admins.intro} />
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {(["super", "operator", "dealer"] as AdminRole[]).map((r) => (
          <div key={r} className="rounded-2xl border border-ink/10 bg-card/70 p-4">
            <Pill color={ROLE_COLOR[r]}>{t.roles[r]}</Pill>
            <p className="mt-2 text-xs text-ink/55">
              {t.admins.access}: {ROLE_ACCESS[r].map((a) => t.nav[a as keyof typeof t.nav]).join(lang === "zh" ? "、" : ", ")}
            </p>
          </div>
        ))}
      </div>

      <Card title={t.admins.add} className="mb-6">
        <form
          className="grid gap-4 md:grid-cols-6 md:items-end"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await call("/api/admin/admins", f)) setF({ ...f, username: "", name: "", password: "" });
          }}
        >
          <Field label={t.admins.username}>
            <input className={inputCls} value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} required pattern="[a-z0-9._\-]{3,40}" />
          </Field>
          <Field label={t.admins.name}>
            <input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
          </Field>
          <Field label={t.admins.role}>
            <select className={inputCls} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as AdminRole })}>
              {(["super", "operator", "dealer"] as AdminRole[]).map((r) => (
                <option key={r} value={r}>
                  {t.roles[r]}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t.admins.dealer}>
            <select className={inputCls} value={f.dealerId} disabled={f.role !== "dealer"} onChange={(e) => setF({ ...f, dealerId: e.target.value })}>
              {dealers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t.admins.password}>
            <input className={inputCls} type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required minLength={8} autoComplete="new-password" />
          </Field>
          <Btn tone="primary" className="md:mb-0">
            + {t.common.add}
          </Btn>
        </form>
      </Card>

      <div className="overflow-x-auto rounded-2xl border border-ink/10 bg-card/70">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-ink/10 text-xs text-ink/50">
            <tr>
              {[t.admins.username, t.admins.name, t.admins.role, t.admins.dealer, t.users.registered, t.common.status, ""].map((h, i) => (
                <th key={i} className="px-4 py-3 text-start font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/[0.07]">
            {rows.map((r) => {
              const self = r.id === me?.id;
              return (
                <tr key={r.id} className={r.disabled ? "opacity-55" : ""}>
                  <td className="px-4 py-3 font-semibold">
                    {r.username} {self && <span className="ms-1 rounded bg-ink/10 px-1.5 text-[10px]">{t.admins.self}</span>}
                  </td>
                  <td className="px-4">{r.name}</td>
                  <td className="px-4">
                    <Pill color={ROLE_COLOR[r.role]}>{t.roles[r.role]}</Pill>
                  </td>
                  <td className="px-4 text-ink/60">{dealers.find((d) => d.id === r.dealerId)?.name ?? "—"}</td>
                  <td className="px-4 text-ink/60">{date(r.createdAt, lang)}</td>
                  <td className="px-4">{r.disabled ? t.common.disabled : t.common.enabled}</td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap justify-end gap-2">
                      {reset?.id === r.id ? (
                        <form
                          className="flex gap-2"
                          onSubmit={async (e) => {
                            e.preventDefault();
                            if (await call("/api/admin/admins", { id: r.id, password: reset.pw }, "PATCH")) setReset(null);
                          }}
                        >
                          <input className={`${inputCls} w-36`} type="password" placeholder={t.admins.newPassword} value={reset.pw} onChange={(e) => setReset({ id: r.id, pw: e.target.value })} minLength={8} required autoComplete="new-password" />
                          <Btn tone="primary">{t.common.save}</Btn>
                        </form>
                      ) : (
                        <Btn tone="ghost" onClick={() => setReset({ id: r.id, pw: "" })}>
                          {t.admins.resetPw}
                        </Btn>
                      )}
                      {!self && (
                        <Btn tone="ghost" onClick={() => call("/api/admin/admins", { id: r.id, disabled: !r.disabled }, "PATCH")}>
                          {r.disabled ? t.users.enable : t.users.disable}
                        </Btn>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
