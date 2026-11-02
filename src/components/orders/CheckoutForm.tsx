"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import { CITIES, CITY_ORDER } from "@/lib/catalog";
import { fill, pkr, signedPkr } from "@/lib/format";
import { api, errorText } from "@/lib/client";
import type { CityKey, QuoteLine, StockStatus } from "@/lib/types";
import ModelVisual, { type VisualModel } from "@/components/vehicle/ModelVisual";
import { Button, Notice } from "@/components/ui";
import { Lock, Store } from "@/components/Icons";

type Props = {
  quoteId: string;
  model: VisualModel;
  color: string;
  colorId?: string;
  wheel?: string;
  lines: QuoteLine[];
  basePrice: number;
  total: number;
  deposit: number;
  depositPercent: number;
  lockHours: number;
  stock: StockStatus;
  me: { name: string; phone: string; city: CityKey };
};

export default function CheckoutForm(p: Props) {
  const { t, tx, lang } = useI18n();
  const router = useRouter();
  const [name, setName] = useState(p.me.name);
  const [phone, setPhone] = useState(p.me.phone);
  const [city, setCity] = useState<CityKey | "">(p.me.city);
  const [err, setErr] = useState<{ code: string; field?: string; n?: number } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!name.trim()) return setErr({ code: "name_required", field: "name" });
    if (!/^(?:\+?92|0)3\d{9}$/.test(phone.replace(/[\s-]/g, ""))) return setErr({ code: "invalid_phone", field: "phone" });
    if (!city) return setErr({ code: "city_required", field: "city" });
    setBusy(true);
    const r = await api<{ id: string }>("/api/orders", { quoteId: p.quoteId, contact: { name, phone, city } });
    if (!r.ok) {
      setBusy(false);
      return setErr({ code: r.error, n: r.n });
    }
    router.push(`/orders/${r.id}?new=1`);
  }

  return (
    <form onSubmit={submit} noValidate className="mx-auto grid max-w-7xl gap-8 px-5 pb-10 lg:grid-cols-[1fr_420px]">
      <div className="space-y-8">
        <section className="glass rounded-3xl p-6 md:p-8">
          <h2 className="font-display text-xl font-semibold">{t.checkout.contact}</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm text-ink/70">{t.checkout.name}</span>
              <input className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} aria-invalid={err?.field === "name"} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm text-ink/70">{t.checkout.phone}</span>
              <input className="field latin" dir="ltr" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t.checkout.phoneHint} autoComplete="tel" maxLength={16} aria-invalid={err?.field === "phone"} />
            </label>
          </div>
        </section>

<section className="glass rounded-3xl p-6 md:p-8">
          <h2 className="font-display text-xl font-semibold">{t.checkout.city}</h2>
          <label className="mt-5 block max-w-sm">
            <select className="field" value={city} onChange={(e) => setCity(e.target.value as CityKey)} aria-invalid={err?.field === "city"} aria-label={t.checkout.city}>
              <option value="">{t.checkout.chooseCity}</option>
              {CITY_ORDER.map((c) => (
                <option key={c} value={c}>
                  {tx(CITIES[c])} — {tx(CITIES[c].region)}
                </option>
              ))}
            </select>
          </label>
          <p className="mt-4 flex gap-2 rounded-2xl bg-ink/[0.05] p-3 text-sm text-ink/70">
            <Store size={16} className="mt-0.5 shrink-0 text-[var(--accent)]" />
            {t.pickup.checkoutNote}
          </p>
        </section>
      </div>

      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="glass overflow-hidden rounded-3xl">
          <div className="stage px-4 pt-4">
            <ModelVisual model={p.model} color={p.color} colorId={p.colorId} wheel={p.wheel} reflection={false} className="aspect-[1000/560] w-full rounded-xl" />
          </div>
          <div className="p-6">
            <p className="font-display latin-d text-2xl font-semibold">{p.model.name}</p>
            <ul className="mt-4 space-y-1.5 text-sm">
              <li className="flex justify-between gap-3">
                <span className="text-ink/60">{t.common.basePrice}</span>
                <span>{pkr(p.basePrice, lang)}</span>
              </li>
              {p.lines.map((l) => (
                <li key={l.group} className="flex justify-between gap-3">
                  <span className="text-ink/60">
                    {tx(l.groupLabel)}: {tx(l.label)}
                  </span>
                  <span className={l.price ? "" : "text-ink/40"}>{signedPkr(l.price, lang)}</span>
                </li>
              ))}
            </ul>
            <div className="my-4 border-t border-ink/10" />
            <div className="flex items-baseline justify-between">
              <span className="font-semibold">{t.common.total}</span>
              <span className="font-display text-2xl font-bold">{pkr(p.total, lang)}</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between text-sm">
              <span className="text-ink/60">
                {t.common.deposit} ({p.depositPercent}%)
              </span>
              <span className="font-semibold text-[var(--accent)]">{pkr(p.deposit, lang)}</span>
            </div>
            <p className="mt-4 flex gap-2 rounded-2xl bg-ink/[0.05] p-3 text-xs leading-relaxed text-ink/65">
              <Lock size={16} className="shrink-0 text-[var(--accent)]" />
              <span>
                {fill(t.checkout.depositNote, { p: p.depositPercent, amount: pkr(p.deposit, lang) })} {fill(t.checkout.lockNote, { h: p.lockHours })}
              </span>
            </p>
            {p.stock === "out" && <Notice tone="error" className="mt-4">{t.errors.out_of_stock}</Notice>}
            {err && (
              <Notice tone="error" className="mt-4">
                {errorText(t, err.code, { n: err.n ?? 0 })}
              </Notice>
            )}
            <Button type="submit" disabled={busy || p.stock === "out"} magnetic={false} className="mt-5 w-full">
              {busy ? t.checkout.submitting : t.checkout.submit}
            </Button>
          </div>
        </div>
      </aside>
    </form>
  );
}
