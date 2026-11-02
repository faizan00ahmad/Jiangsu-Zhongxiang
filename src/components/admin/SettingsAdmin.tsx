"use client";
import { useState } from "react";
import type { Settings } from "@/lib/types";
import { useAdmin } from "./AdminProvider";
import { LangInput } from "./kit/Fields";
import { Btn, Card, Field, PageTitle, Toggle, inputCls } from "./ui";

export default function SettingsAdmin({ s }: { s: Settings }) {
  const { t, call, lang } = useAdmin();
  const [f, setF] = useState(() => structuredClone(s));
  const setCo = (patch: Partial<NonNullable<Settings["company"]>>) => setF({ ...f, company: { name: "", email: "", phone: "", address: { en: "", ur: "" }, ...f.company, ...patch } });
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
        <Card title={lang === "zh" ? "公司信息与维护模式" : "Company and maintenance"}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={lang === "zh" ? "公司名称" : "Company name"}>
              <input className={inputCls} value={f.company?.name ?? ""} onChange={(e) => setCo({ name: e.target.value })} maxLength={80} />
            </Field>
            <Field label={lang === "zh" ? "电话" : "Phone"}>
              <input className={`${inputCls} latin`} value={f.company?.phone ?? ""} onChange={(e) => setCo({ phone: e.target.value })} maxLength={40} />
            </Field>
            <Field label={lang === "zh" ? "官方邮箱（正式咨询）" : "Official email (formal enquiries)"}>
              <input className={`${inputCls} latin`} value={f.company?.email ?? ""} onChange={(e) => setCo({ email: e.target.value })} maxLength={120} />
            </Field>
            <Field label={lang === "zh" ? "客服邮箱" : "Support email"}>
              <input className={`${inputCls} latin`} value={f.company?.supportEmail ?? ""} onChange={(e) => setCo({ supportEmail: e.target.value })} maxLength={120} />
            </Field>
            <Field label="WhatsApp" hint={lang === "zh" ? "含国家代码，例如 923001234567" : "With country code, e.g. 923001234567"}>
              <input className={`${inputCls} latin`} value={f.company?.whatsapp ?? ""} onChange={(e) => setCo({ whatsapp: e.target.value })} maxLength={20} />
            </Field>
            <Field label={lang === "zh" ? "地图链接" : "Map link"} hint="https://maps.app.goo.gl/…">
              <input className={`${inputCls} latin`} value={f.company?.map ?? ""} onChange={(e) => setCo({ map: e.target.value })} maxLength={400} />
            </Field>
            <Field label={lang === "zh" ? "营业时间" : "Opening hours"} className="sm:col-span-2">
              <LangInput value={f.company?.hours} onChange={(v) => setCo({ hours: v })} maxLen={100} />
            </Field>
            <Field label={lang === "zh" ? "地址" : "Address"} className="sm:col-span-2">
              <LangInput value={f.company?.address} onChange={(v) => setCo({ address: v })} maxLen={200} />
            </Field>
            <div className="sm:col-span-2">
              <Toggle on={f.maintenance === true} onChange={(v) => setF({ ...f, maintenance: v })} label={lang === "zh" ? "维护模式：客户端显示“维护中”，后台不受影响" : "Maintenance mode: the public site shows a notice; the admin keeps working"} />
            </div>
          </div>
        </Card>
        <Card title={lang === "zh" ? "社交媒体链接" : "Social media links"} sub={lang === "zh" ? "显示在网站页脚与联系页；手机上点击会优先打开对应 App。" : "Shown in the footer and on the contact page. On phones a tap opens the app first."}>
          <div className="grid gap-4">
            {(["tiktok", "facebook", "instagram", "youtube"] as const).map((n) => (
              <Field key={n} label={n === "tiktok" ? "TikTok" : n === "facebook" ? "Facebook" : n === "instagram" ? "Instagram" : "YouTube"} hint={lang === "zh" ? "完整的 https 主页链接；留空则不显示" : "Full https profile link; leave blank to hide"}>
                <input className={`${inputCls} latin`} value={f.social?.[n] ?? ""} onChange={(e) => setF({ ...f, social: { tiktok: "", facebook: "", instagram: "", youtube: "", ...f.social, [n]: e.target.value } })} maxLength={200} placeholder={`https://www.${n}.com/…`} />
              </Field>
            ))}
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
