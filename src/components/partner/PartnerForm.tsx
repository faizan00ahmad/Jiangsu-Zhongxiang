"use client";
import { useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { CITIES, CITY_ORDER } from "@/lib/catalog";
import { api, errorText } from "@/lib/client";
import type { PartnerType } from "@/lib/types";
import { Button, Notice } from "@/components/ui";
import { Check } from "@/components/Icons";

const TYPES: PartnerType[] = ["agent", "distributor", "affiliate"];

export default function PartnerForm() {
  const { t, tx } = useI18n();
  const [f, setF] = useState({ type: "agent" as PartnerType, name: "", business: "", phone: "", email: "", city: "", experience: "", shop: "none", message: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [ref, setRef] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const r = await api<{ id: string }>("/api/partner", f);
    setBusy(false);
    if (!r.ok) return setErr(errorText(t, r.error));
    setRef(r.id);
  }

  if (ref)
    return (
      <div className="glass mx-auto max-w-2xl rounded-3xl p-8 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--volt)]/15 text-[var(--volt)]">
          <Check size={26} />
        </span>
        <h2 className="font-display mt-4 text-2xl font-semibold">{t.partner.done}</h2>
        <p className="mt-2 text-ink/65">{t.partner.doneText.replace("{ref}", ref)}</p>
        <Button type="button" magnetic={false} className="mt-6" onClick={() => (setRef(null), setF({ ...f, name: "", business: "", message: "", experience: "" }))}>
          {t.partner.again}
        </Button>
      </div>
    );

  return (
    <form onSubmit={submit} className="glass mx-auto max-w-3xl space-y-6 rounded-3xl p-6 md:p-8" noValidate>
      <fieldset>
        <legend className="mb-3 text-sm text-ink/70">{t.partner.type}</legend>
        <div role="radiogroup" className="grid gap-3 sm:grid-cols-3">
          {TYPES.map((x) => (
            <button type="button" role="radio" aria-checked={f.type === x} key={x} onClick={() => setF({ ...f, type: x })} className={`rounded-2xl border p-4 text-start transition ${f.type === x ? "border-[var(--accent)] bg-[var(--accent)]/10 shadow-[0_0_0_1px_var(--accent)]" : "border-ink/12 hover:border-ink/35"}`}>
              <span className="block font-semibold">{t.partner[x]}</span>
              <span className="mt-1 block text-xs text-ink/60">{t.partner[`${x}Text` as "agentText"]}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm text-ink/70">{t.partner.name} *</span>
          <input className="field" value={f.name} onChange={set("name")} maxLength={80} autoComplete="name" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-ink/70">{t.partner.business}</span>
          <input className="field" value={f.business} onChange={set("business")} maxLength={100} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-ink/70">{t.partner.phone} *</span>
          <input className="field latin" dir="ltr" inputMode="tel" value={f.phone} onChange={set("phone")} placeholder="03XX XXXXXXX" maxLength={16} autoComplete="tel" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-ink/70">{t.partner.email}</span>
          <input className="field latin" dir="ltr" type="email" value={f.email} onChange={set("email")} maxLength={120} autoComplete="email" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-ink/70">{t.partner.city} *</span>
          <select className="field" value={f.city} onChange={set("city")}>
            <option value="" />
            {CITY_ORDER.map((c) => (
              <option key={c} value={c}>
                {tx(CITIES[c])}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-ink/70">{t.partner.shop}</span>
          <select className="field" value={f.shop} onChange={set("shop")}>
            <option value="none">{t.partner.shopNone}</option>
            <option value="shop">{t.partner.shopShop}</option>
            <option value="showroom">{t.partner.shopShowroom}</option>
          </select>
        </label>
      </div>
      <label className="block">
        <span className="mb-1.5 block text-sm text-ink/70">{t.partner.experience}</span>
        <textarea className="field min-h-[90px]" value={f.experience} onChange={set("experience")} maxLength={600} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm text-ink/70">{t.partner.message}</span>
        <textarea className="field min-h-[90px]" value={f.message} onChange={set("message")} maxLength={800} />
      </label>
      {err && <Notice tone="error">{err}</Notice>}
      <Button type="submit" disabled={busy} magnetic={false}>
        {busy ? t.partner.working : t.partner.submit}
      </Button>
    </form>
  );
}
