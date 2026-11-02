"use client";
import { useState } from "react";
import type { Role } from "@/lib/types";
import { useAdmin } from "./AdminProvider";
import DataTable, { type Col } from "./kit/DataTable";
import Modal from "./kit/Modal";
import { Btn, Field, PageTitle, Pill, inputCls } from "./ui";

type Row = { id: string; username: string; name: string; role: string; dealerId: string | null; createdAt: string; disabled: boolean; lastLoginAt: string | null };

export default function AdminsAdmin({ rows, roles, dealers }: { rows: Row[]; roles: Role[]; dealers: { id: string; name: string }[] }) {
  const { t, k, lang, call, can, me, confirm } = useAdmin();
  const [open, setOpen] = useState<null | { id: string | null; f: { username: string; name: string; role: string; dealerId: string; password: string } }>(null);
  const roleName = (id: string) => roles.find((r) => r.id === id)?.name.en ?? id;
  const dealerRole = (id: string) => roles.find((r) => r.id === id)?.scope === "dealer";
  const edit = can("admins.edit");

  const cols: Col<Row>[] = [
    { key: "username", header: t.admins.username, value: (r) => r.username, render: (r) => <span className="latin font-medium">{r.username}</span> },
    { key: "name", header: t.admins.name, value: (r) => r.name },
    { key: "role", header: t.admins.role, value: (r) => roleName(r.role), render: (r) => <Pill color={r.role === "super" ? "#ff4d3d" : r.role === "dealer" ? "#f5b40c" : "#3d8bff"}>{roleName(r.role)}</Pill> },
    { key: "dealer", header: t.admins.dealer, value: (r) => dealers.find((d) => d.id === r.dealerId)?.name ?? "" },
    { key: "last", header: lang === "zh" ? "最近登录" : "Last sign-in", value: (r) => r.lastLoginAt ?? "", render: (r) => <span className="latin text-ink/65">{r.lastLoginAt ? new Date(r.lastLoginAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—"}</span> },
    { key: "status", header: t.common.status, value: (r) => (r.disabled ? 0 : 1), render: (r) => <Pill color={r.disabled ? "#8b93a3" : "#2ee6a6"}>{r.disabled ? t.common.disabled : t.common.enabled}</Pill> },
    {
      key: "act",
      header: "",
      sortable: false,
      render: (r) =>
        edit && r.id !== me?.id ? (
          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <Btn tone="ghost" onClick={() => setOpen({ id: r.id, f: { username: r.username, name: r.name, role: r.role, dealerId: r.dealerId ?? dealers[0]?.id ?? "", password: "" } })}>
              {k.form.edit}
            </Btn>
            <Btn
              tone="ghost"
              onClick={async () => {
                if (!r.disabled && !(await confirm(lang === "zh" ? `停用 ${r.username}？` : `Disable ${r.username}?`))) return;
                await call("/api/admin/admins", { id: r.id, disabled: !r.disabled }, "PATCH");
              }}
            >
              {r.disabled ? (lang === "zh" ? "启用" : "Enable") : lang === "zh" ? "停用" : "Disable"}
            </Btn>
          </div>
        ) : null,
    },
  ];

  const save = async () => {
    if (!open) return;
    const f = open.f;
    const done = open.id
      ? await call("/api/admin/admins", { id: open.id, name: f.name, role: f.role, dealerId: f.dealerId, password: f.password || undefined }, "PATCH")
      : await call("/api/admin/admins", { username: f.username, name: f.name, role: f.role, dealerId: dealerRole(f.role) ? f.dealerId : undefined, password: f.password });
    if (done) setOpen(null);
  };

  return (
    <div>
      <PageTitle
        title={k.modules.admins}
        intro={t.admins.intro}
        actions={
          can("admins.create") && (
            <Btn tone="primary" onClick={() => setOpen({ id: null, f: { username: "", name: "", role: roles.find((r) => r.id === "operator")?.id ?? roles[0].id, dealerId: dealers[0]?.id ?? "", password: "" } })}>
              + {k.form.new}
            </Btn>
          )
        }
      />
      <DataTable id="admins" rows={rows} rowId={(r) => r.id} columns={cols} filters={[{ key: "role", label: t.admins.role, options: roles.map((r) => ({ value: r.id, label: r.name.en })), value: (r) => r.role }]} defaultSort={{ key: "username", dir: "asc" }} />
      <Modal
        open={!!open}
        onClose={() => setOpen(null)}
        title={`${open?.id ? k.form.edit : k.form.new} · ${k.modules.admins}`}
        footer={
          <>
            <Btn onClick={() => setOpen(null)}>{k.form.cancel}</Btn>
            <Btn tone="primary" onClick={save}>
              {open?.id ? k.form.save : k.form.create}
            </Btn>
          </>
        }
      >
        {open && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.admins.username}>
              <input className={`${inputCls} latin`} value={open.f.username} disabled={!!open.id} onChange={(e) => setOpen({ ...open, f: { ...open.f, username: e.target.value } })} autoComplete="off" />
            </Field>
            <Field label={t.admins.name}>
              <input className={inputCls} value={open.f.name} onChange={(e) => setOpen({ ...open, f: { ...open.f, name: e.target.value } })} />
            </Field>
            <Field label={t.admins.role}>
              <select className={inputCls} value={open.f.role} onChange={(e) => setOpen({ ...open, f: { ...open.f, role: e.target.value } })}>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name.en}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t.admins.dealer}>
              <select className={inputCls} value={open.f.dealerId} disabled={!dealerRole(open.f.role)} onChange={(e) => setOpen({ ...open, f: { ...open.f, dealerId: e.target.value } })}>
                {dealers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={open.id ? (lang === "zh" ? "新密码（留空不改）" : "New password (blank = keep)") : t.admins.password} className="sm:col-span-2">
              <input type="password" className={`${inputCls} latin`} value={open.f.password} onChange={(e) => setOpen({ ...open, f: { ...open.f, password: e.target.value } })} autoComplete="new-password" />
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
