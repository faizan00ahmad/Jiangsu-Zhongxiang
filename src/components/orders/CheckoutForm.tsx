"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import { CITIES, CITY_ORDER } from "@/lib/catalog";
import { fill, pkr, signedPkr } from "@/lib/format";
import { api, errorText } from "@/lib/client";
import type { CityKey, Dealer, QuoteLine, StockStatus } from "@/lib/types";
import ModelVisual, { type VisualModel } from "@/components/vehicle/ModelVisual";
import { Button, Notice } from "@/components/ui";
import { Lock, Phone, Pin, Store } from "@/components/Icons";

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
  dealers: Dealer[];
  me: { name: string; phone: string; city: CityKey };
};

export default function CheckoutForm(p: Props) {
  const { t, tx, lang } = useI18n();
  const router = useRouter();
  const [name, setName] = useState(p.me.name);
  const [phone, setPhone] = useState(p.me.phone);
  const [city, setCity] = useState<CityKey | "">(p.dealers.some((d) => d.city === p.me.city) ? p.me.city : "");
  const [dealerId, setDealerId] = useState("");
  const [err, setErr] = useState<{ code: string; field?: string; n?: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const cities = useMemo(() => CITY_ORDER.filter((c) => p.dealers.some((d) => d.city === c)), [p.dealers]);
  const list = p.dealers.filter((d) => d.city === city);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!name.trim()) return setErr({ code: "name_required", field: "name" });
    if (!/^(?:\+?92|0)3\d{9}$/.test(phone.replace(/[\s-]/g, ""))) return setErr({ code: "invalid_phone", field: "phone" });
    if (!dealerId) return setErr({ code: "dealer_required", field: "dealer" });
    setBusy(true);
    const r = await api<{ id: string }>("/api/orders", { quoteId: p.quoteId, contact: { name, phone, dealerId } });
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
          <h2 className="font-display text-xl font-semibold">{t.checkout.dealer}</h2>
          <label className="mt-5 block max-w-sm">
            <span className="mb-1.5 block text-sm text-ink/70">{t.checkout.city}</span>
            <select
              className="field"
              value={city}
              onChange={(e) => {
                setCity(e.target.value as CityKey);
                setDealerId("");
              }}
            >
              <option value="">{t.checkout.chooseCity}</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {tx(CITIES[c])} — {tx(CITIES[c].region)}
                </option>
              ))}
            </select>
          </label>
          {city && list.length === 0 && <Notice className="mt-4">{t.checkout.noDealer}</Notice>}
          <div role="radiogroup" aria-label={t.checkout.dealer} aria-invalid={err?.field === "dealer"} className="mt-5 grid gap-3 md:grid-cols-2">
            {list.map((d) => {
              const on = d.id === dealerId;
              return (
                <button type="button" role="radio" aria-checked={on} key={d.id} onClick={() => setDealerId(d.id)} className={`rounded-2xl border p-4 text-start transition ${on ? "border-[var(--accent)] bg-[var(--accent)]/10 shadow-[0_0_0_1px_var(--accent)]" : "border-ink/12 hover:border-ink/35"}`}>
                  <span className="flex items-center gap-2 font-semibold">
                    <Store size={16} className="text-[var(--accent)]" />
                    {tx(d.name)}
                  </span>
                  <span className="mt-2 flex items-start gap-2 text-sm text-ink/60">
                    <Pin size={14} className="mt-1 shrink-0" />
                    {tx(d.address)}
                  </span>
                  <span className="latin mt-1 flex items-center gap-2 text-sm text-ink/60">
                    <Phone size={14} />
                    <span dir="ltr">{d.phone}</span>
                  </span>
                </button>
              );
            })}
          </div>
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
