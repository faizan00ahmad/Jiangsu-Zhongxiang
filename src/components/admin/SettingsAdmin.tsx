"use client";
import { useState } from "react";
import type { Settings } from "@/lib/types";
import { useAdmin } from "./AdminProvider";
import { Btn, Card, Field, PageTitle, inputCls } from "./ui";

export default function SettingsAdmin({ s }: { s: Settings }) {
  const { t, call } = useAdmin();
  const [f, setF] = useState(() => structuredClone(s));
  const dirty = JSON.stringify(f) !== JSON.stringify(s);
  const num = (k: "depositPercent" | "lockHours" | "maxOpenOrders" | "lowStock") => ({ value: f[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: Number(e.target.value) }) });
  return (
    <>
      <PageTitle
        title={t.settings.title}
        intro={t.settings.intro}
        actions={
          <div className="flex items-center gap-3">
            {dirty && <span className="text-xs text-[var(--amber)]">{t.common.unsaved}</span>}
            <Btn tone="primary" disabled={!dirty} onClick={() => call("/api/admin/settings", f, "PUT")}>
              {t.common.save}
            </Btn>
          </div>
        }
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title={t.settings.rules}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.settings.deposit}>
              <input className={inputCls} type="number" min={1} max={100} {...num("depositPercent")} />
            </Field>
            <Field label={t.settings.lockHours} hint={t.settings.lockHint}>
              <input className={inputCls} type="number" min={1} max={720} {...num("lockHours")} />
            </Field>
            <Field label={t.settings.maxOpen}>
              <input className={inputCls} type="number" min={1} max={20} {...num("maxOpenOrders")} />
            </Field>
            <Field label={t.settings.lowStock}>
              <input className={inputCls} type="number" min={0} max={1000} {...num("lowStock")} />
            </Field>
          </div>
        </Card>
        <Card title={t.settings.copy}>
          <div className="space-y-4">
            {(["heroTitle", "heroText"] as const).map((k) => (
              <div key={k} className="grid gap-3 sm:grid-cols-2">
                <Field label={`${t.settings[k]} · ${t.common.en}`}>
                  <textarea className={`${inputCls} min-h-20`} value={f[k].en} onChange={(e) => setF({ ...f, [k]: { ...f[k], en: e.target.value } })} maxLength={400} />
                </Field>
                <Field label={`${t.settings[k]} · ${t.common.ur}`}>
                  <textarea className={`${inputCls} min-h-20`} dir="rtl" lang="ur" value={f[k].ur} onChange={(e) => setF({ ...f, [k]: { ...f[k], ur: e.target.value } })} maxLength={400} />
                </Field>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
