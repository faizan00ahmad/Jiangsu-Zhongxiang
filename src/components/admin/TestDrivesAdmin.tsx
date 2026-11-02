"use client";
import { useState } from "react";
import type { TestDriveRules, TestDriveStatus } from "@/lib/types";
import { useAdmin } from "./AdminProvider";
import DataTable, { type Col } from "./kit/DataTable";
import { MultiPick } from "./kit/Fields";
import Modal from "./kit/Modal";
import { Btn, Card, Field, PageTitle, Pill, Toggle, inputCls } from "./ui";

export type DriveRow = { id: string; date: string; time: string; status: TestDriveStatus; model: string; store: string; dealerId: string; name: string; phone: string; note: string; adminNote: string; createdAt: string; history: { at: string; by: string; action: string }[] };
export type StoreRules = { id: string; name: string; city: string; rules: TestDriveRules };

const COLOR: Record<TestDriveStatus, string> = { requested: "#f5b40c", confirmed: "#2ee6a6", completed: "#3d8bff", cancelled: "#8b93a3", no_show: "#ff4d3d" };
const DAYS = [
  [1, "周一", "Mon"],
  [2, "周二", "Tue"],
  [3, "周三", "Wed"],
  [4, "周四", "Thu"],
  [5, "周五", "Fri"],
  [6, "周六", "Sat"],
  [0, "周日", "Sun"],
] as const;

export default function TestDrivesAdmin({ rows, stores, models }: { rows: DriveRow[]; stores: StoreRules[]; models: { slug: string; name: string }[] }) {
  const { k, lang, call, can } = useAdmin();
  const z = (zh: string, en: string) => (lang === "zh" ? zh : en);
  const ST: Record<TestDriveStatus, string> = { requested: z("待确认", "Requested"), confirmed: z("已确认", "Confirmed"), completed: z("已完成", "Completed"), cancelled: z("已取消", "Cancelled"), no_show: z("未到场", "No-show") };
  const [open, setOpen] = useState<DriveRow | null>(null);
  const [draft, setDraft] = useState({ date: "", time: "", adminNote: "" });
  const [rules, setRules] = useState<StoreRules | null>(null);
  const edit = can("testdrives.edit");

  const cols: Col<DriveRow>[] = [
    { key: "id", header: z("编号", "Booking"), value: (r) => r.id, render: (r) => <span className="latin font-mono text-xs font-semibold">{r.id}</span> },
    { key: "when", header: z("时间", "When"), value: (r) => `${r.date} ${r.time}`, render: (r) => <span className="latin whitespace-nowrap">{r.date} · {r.time}</span> },
    { key: "status", header: z("状态", "Status"), value: (r) => ST[r.status], render: (r) => <Pill color={COLOR[r.status]}>{ST[r.status]}</Pill> },
    { key: "model", header: z("车型", "Model"), value: (r) => r.model },
    { key: "store", header: z("门店", "Store"), value: (r) => r.store },
    { key: "name", header: z("客户", "Customer"), value: (r) => `${r.name} ${r.phone}`, render: (r) => (<>{r.name}<span className="latin block text-xs text-ink/45">{r.phone}</span></>) },
    { key: "created", header: z("提交时间", "Requested"), value: (r) => r.createdAt, defaultHidden: true, render: (r) => <span className="latin text-ink/55">{new Date(r.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span> },
  ];

  const act = async (patch: Record<string, unknown>) => {
    if (!open) return;
    if (await call("/api/admin/testdrives", { id: open.id, ...patch }, "PATCH")) setOpen(null);
  };
  const flow: Record<TestDriveStatus, TestDriveStatus[]> = { requested: ["confirmed", "cancelled"], confirmed: ["completed", "no_show", "cancelled"], completed: [], cancelled: [], no_show: [] };

  return (
    <div>
      <PageTitle title={k.modules.testdrives} intro={z("客户预约的试驾。门店或管理员确认后，客户会收到短信和邮件。下方可设置每家门店的试驾时间。", "Test drives customers booked. Once the store or an admin confirms, the customer gets an SMS and email. Set each store's test drive hours below.")} />
      <DataTable
        id="testdrives"
        rows={rows}
        rowId={(r) => r.id}
        columns={cols}
        defaultSort={{ key: "when", dir: "asc" }}
        onRow={(r) => (setOpen(r), setDraft({ date: r.date, time: r.time, adminNote: r.adminNote }))}
        filters={[
          { key: "status", label: z("状态", "Status"), options: (Object.keys(ST) as TestDriveStatus[]).map((s) => ({ value: s, label: ST[s] })), value: (r) => r.status },
          { key: "store", label: z("门店", "Store"), options: [...new Set(rows.map((r) => r.store))].map((s) => ({ value: s, label: s })), value: (r) => r.store },
        ]}
        exportBase={can("testdrives.export") ? "/api/admin/testdrives/export" : undefined}
      />

      <Card title={z("门店试驾设置", "Store test drive hours")} className="mt-6">
        <ul className="divide-y divide-ink/10">
          {stores.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-ink/50">
                  {s.city} · {s.rules.enabled ? `${s.rules.from}–${s.rules.to} · ${s.rules.slotMinutes} min · ×${s.rules.capacity}` : z("未开放试驾", "Test drives off")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Pill color={s.rules.enabled ? "#2ee6a6" : "#8b93a3"}>{s.rules.enabled ? k.status.on : k.status.off}</Pill>
                {edit && (
                  <Btn onClick={() => setRules(structuredClone(s))}>
                    {k.form.edit}
                  </Btn>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? `${open.id} · ${open.model}` : ""} wide>
        {open && (
          <div className="space-y-5 text-sm">
            <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
              <div><dt className="text-xs text-ink/45">{z("客户", "Customer")}</dt><dd>{open.name} · <span className="latin">{open.phone}</span></dd></div>
              <div><dt className="text-xs text-ink/45">{z("门店", "Store")}</dt><dd>{open.store}</dd></div>
              <div><dt className="text-xs text-ink/45">{z("状态", "Status")}</dt><dd><Pill color={COLOR[open.status]}>{ST[open.status]}</Pill></dd></div>
              <div><dt className="text-xs text-ink/45">{z("客户备注", "Customer note")}</dt><dd>{open.note || "—"}</dd></div>
            </dl>
            {edit && (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label={z("日期", "Date")}><input type="date" className={`${inputCls} latin`} value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} disabled={flow[open.status].length === 0} /></Field>
                  <Field label={z("时间", "Time")}><input type="time" className={`${inputCls} latin`} value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} disabled={flow[open.status].length === 0} /></Field>
                  <Field label={z("内部备注", "Staff note")} className="sm:col-span-3"><input className={inputCls} value={draft.adminNote} onChange={(e) => setDraft({ ...draft, adminNote: e.target.value })} maxLength={400} /></Field>
                </div>
                <div className="flex flex-wrap gap-2">
                  {flow[open.status].map((s) => (
                    <Btn key={s} tone={s === "cancelled" || s === "no_show" ? "danger" : "primary"} onClick={() => act({ status: s, date: draft.date, time: draft.time, adminNote: draft.adminNote })}>
                      → {ST[s]}
                    </Btn>
                  ))}
                  <Btn onClick={() => act({ date: draft.date, time: draft.time, adminNote: draft.adminNote })}>{z("仅保存修改", "Save changes only")}</Btn>
                </div>
              </>
            )}
            <ul className="space-y-1 text-xs text-ink/55">
              {open.history.map((h, i) => (<li key={i}><span className="latin">{new Date(h.at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span> · {h.by} · {h.action}</li>))}
            </ul>
          </div>
        )}
      </Modal>

      <Modal
        open={!!rules}
        onClose={() => setRules(null)}
        title={rules ? `${rules.name} · ${z("试驾设置", "test drive hours")}` : ""}
        footer={
          <>
            <Btn onClick={() => setRules(null)}>{k.form.cancel}</Btn>
            <Btn tone="primary" onClick={async () => rules && (await call("/api/admin/testdrives", { dealerId: rules.id, rules: rules.rules }, "PUT")) && setRules(null)}>{k.form.save}</Btn>
          </>
        }
      >
        {rules && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Toggle on={rules.rules.enabled} onChange={(v) => setRules({ ...rules, rules: { ...rules.rules, enabled: v } })} label={z("开放试驾预约", "Offer test drives")} /></div>
            <Field label={z("营业日", "Days")} className="sm:col-span-2">
              <MultiPick value={rules.rules.days.map(String)} options={DAYS.map(([n, zh, en]) => ({ value: String(n), label: { zh, en } }))} onChange={(v) => setRules({ ...rules, rules: { ...rules.rules, days: v.map(Number) } })} />
            </Field>
            <Field label={z("开始", "From")}><input type="time" className={`${inputCls} latin`} value={rules.rules.from} onChange={(e) => setRules({ ...rules, rules: { ...rules.rules, from: e.target.value } })} /></Field>
            <Field label={z("结束", "To")}><input type="time" className={`${inputCls} latin`} value={rules.rules.to} onChange={(e) => setRules({ ...rules, rules: { ...rules.rules, to: e.target.value } })} /></Field>
            <Field label={z("每场分钟数", "Minutes per slot")}><input type="number" min={15} max={240} step={15} className={`${inputCls} latin`} value={rules.rules.slotMinutes} onChange={(e) => setRules({ ...rules, rules: { ...rules.rules, slotMinutes: Number(e.target.value) } })} /></Field>
            <Field label={z("每场可约人数", "Bookings per slot")}><input type="number" min={1} max={20} className={`${inputCls} latin`} value={rules.rules.capacity} onChange={(e) => setRules({ ...rules, rules: { ...rules.rules, capacity: Number(e.target.value) } })} /></Field>
            <Field label={z("可试驾车型（空=全部）", "Models available (empty = all)")} className="sm:col-span-2">
              <MultiPick value={rules.rules.models} options={models.map((m) => ({ value: m.slug, label: { zh: m.name, en: m.name } }))} onChange={(v) => setRules({ ...rules, rules: { ...rules.rules, models: v } })} />
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
