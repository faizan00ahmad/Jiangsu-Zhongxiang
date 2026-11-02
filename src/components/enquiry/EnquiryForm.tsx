"use client";
import { useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { CITIES, CITY_ORDER } from "@/lib/catalog";
import { api, errorText } from "@/lib/client";
import type { EnquiryForm as Kind } from "@/lib/types";
import { Button, Notice } from "@/components/ui";
import { Check } from "@/components/Icons";

const KINDS: Kind[] = ["sales", "dealership", "support", "export"];

export default function EnquiryForm({ models, me }: { models: { slug: string; name: string }[]; me: { name: string; phone: string; email: string; city: string } | null }) {
  const { t, tx } = useI18n();
  const [f, setF] = useState({ form: "sales" as Kind, name: me?.name ?? "", phone: me?.phone ?? "", email: me?.email ?? "", city: me?.city ?? "", model: "", message: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [ref, setRef] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const r = await api<{ id: string }>("/api/enquiry", f);
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
        <h2 className="font-display mt-4 text-2xl font-semibold">{t.enquiry.done}</h2>
        <p className="mt-2 text-ink/65">{t.enquiry.doneText.replace("{ref}", ref)}</p>
        <Button type="button" magnetic={false} className="mt-6" onClick={() => (setRef(null), setF({ ...f, message: "" }))}>
          {t.enquiry.again}
        </Button>
      </div>
    );

  return (
    <form onSubmit={submit} noValidate className="glass mx-auto max-w-3xl space-y-6 rounded-3xl p-6 md:p-8">
      <fieldset>
        <legend className="mb-3 text-sm text-ink/70">{t.enquiry.form}</legend>
        <div role="radiogroup" className="grid gap-2.5 sm:grid-cols-2">
          {KINDS.map((k) => (
            <button type="button" role="radio" aria-checked={f.form === k} key={k} onClick={() => setF({ ...f, form: k })} className={`rounded-2xl border px-4 py-3 text-start text-sm font-semibold transition ${f.form === k ? "border-[var(--accent)] bg-[var(--accent)]/10 shadow-[0_0_0_1px_var(--accent)]" : "border-ink/12 hover:border-ink/35"}`}>
              {t.enquiry[k]}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm text-ink/70">{t.enquiry.name} *</span>
          <input className="field" value={f.name} onChange={set("name")} maxLength={80} autoComplete="name" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-ink/70">{t.enquiry.phone} *</span>
          <input className="field latin" dir="ltr" inputMode="tel" value={f.phone} onChange={set("phone")} placeholder="03XX XXXXXXX" maxLength={16} autoComplete="tel" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-ink/70">{t.enquiry.email}</span>
          <input className="field latin" dir="ltr" type="email" value={f.email} onChange={set("email")} maxLength={120} autoComplete="email" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-ink/70">{t.enquiry.city}</span>
          <select className="field" value={f.city} onChange={set("city")}>
            <option value="" />
            {CITY_ORDER.map((c) => (
              <option key={c} value={c}>
                {tx(CITIES[c])}
              </option>
            ))}
          </select>
        </label>
        <label className="block md:col-span-2">
          <span className="mb-1.5 block text-sm text-ink/70">{t.enquiry.model}</span>
          <select className="field" value={f.model} onChange={set("model")}>
            <option value="" />
            {models.map((m) => (
              <option key={m.slug} value={m.slug}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block">
        <span className="mb-1.5 block text-sm text-ink/70">{t.enquiry.message} *</span>
        <textarea className="field min-h-[140px]" value={f.message} onChange={set("message")} maxLength={1500} />
      </label>
      {err && <Notice tone="error">{err}</Notice>}
      <Button type="submit" disabled={busy} magnetic={false}>
        {busy ? t.enquiry.working : t.enquiry.submit}
      </Button>
    </form>
  );
}
