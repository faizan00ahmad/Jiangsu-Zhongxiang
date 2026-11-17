"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import { CITIES, CITY_ORDER } from "@/lib/catalog";
import { fill, pkr } from "@/lib/format";
import { api, errorText } from "@/lib/client";
import { zoneFor, type ZoneInfo } from "@/lib/shipping";
import type { CartView } from "@/lib/server/checkout";
import type { CityKey, Model, PayMethod, PayMode } from "@/lib/types";
import ModelVisual, { type VisualModel } from "@/components/vehicle/ModelVisual";
import { Approx } from "@/components/Currency";
import { Notice } from "@/components/ui";
import { Lock, Store } from "@/components/Icons";
import CheckoutSteps from "./CheckoutSteps";
import MethodPicker from "./MethodPicker";
import { useCart } from "@/components/cart/CartProvider";

type Props = {
  view: CartView;
  models: (VisualModel & Pick<Model, "slug">)[];
  colors: Record<string, string>;
  zones: ZoneInfo[];
  methods: PayMethod[];
  depositPercent: number;
  deposit: number;
  lockHours: number;
  me: { name: string; phone: string; city: CityKey };
};

type Quote = { discount: number; couponCode: string | null; total: number; deposit: number };

/** Details, then payment, in two steps. The coupon and every amount shown here come from the server; placing the order prices everything again. */
export default function CheckoutFlow(p: Props) {
  const { t, tx, lang } = useI18n();
  const router = useRouter();
  const { reload } = useCart();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState(p.me.name);
  const [phone, setPhone] = useState(p.me.phone);
  const [city, setCity] = useState<CityKey | "">(p.me.city);
  const [method, setMethod] = useState<PayMethod | "">(p.methods[0] ?? "");
  const [mode, setMode] = useState<PayMode>("advance");
  const [terms, setTerms] = useState(false);
  const [err, setErr] = useState<{ code: string; field?: string; n?: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<Quote | null>(null);
  const [couponErr, setCouponErr] = useState("");
  const [checking, setChecking] = useState(false);

  const subtotal = p.view.subtotal;
  const total = applied?.total ?? subtotal;
  const advance = applied?.deposit ?? p.deposit;
  const due = mode === "full" ? total : advance;
  const zone = zoneFor(p.zones, city || null);
  const visual = (slug: string) => p.models.find((m) => m.slug === slug);

  async function applyCoupon() {
    if (!code.trim()) return;
    setCouponErr("");
    setChecking(true);
    const r = await api<{ discount: number; couponCode: string | null; couponError: string | null; total: number; deposit: number }>("/api/cart/price", { items: p.view.lines.map((l) => ({ id: l.id, quoteId: l.quoteId, qty: l.qty })), coupon: code });
    setChecking(false);
    if (!r.ok) return setCouponErr(errorText(t, r.error));
    if (r.couponError || !r.couponCode) {
      setApplied(null);
      return setCouponErr(errorText(t, r.couponError ?? "coupon_invalid"));
    }
    setApplied({ discount: r.discount, couponCode: r.couponCode, total: r.total, deposit: r.deposit });
  }

  function toPayment(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!name.trim()) return setErr({ code: "name_required", field: "name" });
    if (!/^(?:\+?92|0)3\d{9}$/.test(phone.replace(/[\s-]/g, ""))) return setErr({ code: "invalid_phone", field: "phone" });
    if (!city) return setErr({ code: "city_required", field: "city" });
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function pay() {
    setErr(null);
    if (!method) return setErr({ code: "method_required" });
    setBusy(true);
    const r = await api<{ intentId: string }>("/api/checkout", { contact: { name, phone, city }, method, mode, coupon: applied?.couponCode ?? undefined });
    if (!r.ok) {
      setBusy(false);
      if (r.error.startsWith("coupon_")) {
        setApplied(null);
        setCouponErr(errorText(t, r.error));
      }
      return setErr({ code: r.error, n: r.n });
    }
    void reload(); // the cart is empty now; the header count follows
    router.push(`/pay/${r.intentId}`);
  }

  return (
    <div className="px-5 pb-24">
      <CheckoutSteps at={step} />
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_420px]">
        <div className="space-y-8">
          {step === 1 ? (
            <form onSubmit={toPayment} noValidate className="space-y-8">
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
                {zone && (
                  <p className="mt-4 rounded-2xl border border-ink/10 p-3 text-sm" role="status">
                    <b>{t.checkout.shipTitle}</b> · {tx(zone.name)}
                    <span className="mt-1 block text-ink/70">{fill(t.checkout.shipEstimate, { cost: pkr(zone.baseCost, lang), days: zone.extraDays })}</span>
                    <span className="mt-1 block text-xs text-ink/55">{t.checkout.shipNote}</span>
                  </p>
                )}
                <p className="mt-4 flex gap-2 rounded-2xl bg-ink/[0.05] p-3 text-sm text-ink/70">
                  <Store size={16} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                  {t.pickup.checkoutNote}
                </p>
              </section>
              {err && <Notice tone="error">{errorText(t, err.code, { n: err.n ?? 0 })}</Notice>}
              <div className="flex flex-wrap gap-3">
                <Link href="/cart" className="inline-flex h-12 items-center rounded-full border border-ink/20 px-6 text-sm font-semibold hover:bg-ink/10">
                  {t.checkout.back}
                </Link>
                <button type="submit" className="inline-flex h-12 items-center rounded-full bg-[#111] px-8 text-sm font-semibold text-white hover:bg-black">
                  {t.checkout.next}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-8">
              <section className="glass rounded-3xl p-6 md:p-8">
                <h2 className="font-display text-xl font-semibold">{t.pay.payHow}</h2>
                <div role="radiogroup" aria-label={t.pay.payHow} className="mt-5 grid gap-2.5 sm:grid-cols-2">
                  {(["advance", "full"] as const).map((m) => {
                    const on = mode === m;
                    return (
                      <button key={m} type="button" role="radio" aria-checked={on} onClick={() => setMode(m)} className={`rounded-2xl border px-4 py-3 text-start transition ${on ? "border-[var(--accent)] bg-[var(--accent)]/10" : "border-ink/15 hover:border-ink/40"}`}>
                        <span className="block text-sm font-semibold">{m === "advance" ? fill(t.pay.advanceOpt, { p: p.depositPercent }) : t.pay.fullOpt}</span>
                        <span className="font-display mt-1 block text-lg font-bold">{pkr(m === "advance" ? advance : total, lang)}</span>
                        <span className="block text-xs text-ink/55">{m === "advance" ? t.pay.advanceNote : t.pay.fullNote}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
              <section className="glass rounded-3xl p-6 md:p-8">
                <h2 className="font-display text-xl font-semibold">{t.checkout.payTitle}</h2>
                <div className="mt-5">{p.methods.length ? <MethodPicker methods={p.methods} value={method} onChange={setMethod} /> : <Notice tone="error">{t.checkout.noMethods}</Notice>}</div>
              </section>
              <label className="flex items-start gap-3 text-sm">
                <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-1 h-4 w-4" />
                <span>
                  {t.checkout.termsPre}{" "}
                  <Link href="/terms" target="_blank" className="font-semibold underline">{t.checkout.terms}</Link> {t.checkout.termsMid}{" "}
                  <Link href="/returns" target="_blank" className="font-semibold underline">{t.checkout.returns}</Link>.
                </span>
              </label>
              {err && <Notice tone="error">{errorText(t, err.code, { n: err.n ?? 0 })}</Notice>}
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => setStep(1)} disabled={busy} className="inline-flex h-12 items-center rounded-full border border-ink/20 px-6 text-sm font-semibold hover:bg-ink/10">
                  {t.checkout.back}
                </button>
                <button type="button" onClick={pay} disabled={busy || !terms || !method} className="inline-flex h-12 items-center rounded-full bg-[#111] px-8 text-sm font-semibold text-white hover:bg-black disabled:opacity-50">
                  {busy ? t.checkout.placing : fill(t.order.payNow, { amount: pkr(due, lang) })}
                </button>
              </div>
              {p.view.units > 1 && <p className="text-xs text-ink/55">{fill(t.checkout.ordersNote, { n: p.view.units })}</p>}
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="glass overflow-hidden rounded-3xl p-6">
            <ul className="space-y-4">
              {p.view.lines.map((l) => {
                const m = visual(l.slug);
                return (
                  <li key={l.id + l.quoteId} className="flex items-center gap-3">
                    {m && (
                      <div className="stage w-24 shrink-0 rounded-xl px-1 pt-1">
                        <ModelVisual model={m} color={p.colors[l.config.color ?? ""] ?? m.colors?.[0]?.hex ?? "#ccc"} colorId={l.config.color} wheel={l.config.wheel} reflection={false} className="aspect-[1000/560] w-full" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="latin-d truncate font-semibold">{fill(t.checkout.qtyLine, { n: l.qty, name: l.name })}</p>
                      <p className="text-ink/60">{pkr(l.total, lang)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="my-4 border-t border-ink/10" />
            <label htmlFor="coupon" className="mb-1.5 block text-sm text-ink/70">{t.checkout.coupon}</label>
            {applied ? (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--accent)]/10 px-3 py-2 text-sm">
                <span>{fill(t.checkout.couponApplied, { code: applied.couponCode ?? "", amount: pkr(applied.discount, lang) })}</span>
                <button type="button" onClick={() => (setApplied(null), setCode(""), setCouponErr(""))} className="shrink-0 text-xs font-semibold underline">{t.checkout.couponRemove}</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input id="coupon" className="field latin min-w-0 flex-1 uppercase" dir="ltr" value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void applyCoupon(); } }} placeholder={t.checkout.couponHint} maxLength={40} autoComplete="off" aria-invalid={!!couponErr} />
                <button type="button" onClick={applyCoupon} disabled={checking || !code.trim()} className="shrink-0 rounded-xl border border-ink/20 px-4 text-sm font-semibold transition hover:bg-ink hover:text-bg disabled:opacity-50">{t.checkout.couponApply}</button>
              </div>
            )}
            {couponErr && <p role="alert" className="mt-1.5 text-xs text-red-600">{couponErr}</p>}
            {applied && (
              <div className="mt-3 flex justify-between gap-3 text-sm">
                <span className="text-ink/60">{t.checkout.discount}</span>
                <span className="text-[var(--accent)]">− {pkr(applied.discount, lang)}</span>
              </div>
            )}
            <div className="mt-3 flex items-baseline justify-between">
              <span className="font-semibold">{t.common.total}</span>
              <span className="font-display text-2xl font-bold">{pkr(total, lang)}</span>
            </div>
            <div className="text-end"><Approx pkr={total} className="!text-xs" /></div>
            <div className="mt-2 flex items-baseline justify-between text-sm">
              <span className="text-ink/60">{mode === "full" ? t.pay.fullOpt : `${t.common.deposit} (${p.depositPercent}%)`}</span>
              <span className="font-semibold text-[var(--accent)]">{pkr(due, lang)}</span>
            </div>
            <p className="mt-4 flex gap-2 rounded-2xl bg-ink/[0.05] p-3 text-xs leading-relaxed text-ink/65">
              <Lock size={16} className="shrink-0 text-[var(--accent)]" />
              <span>
                {fill(t.checkout.depositNote, { p: p.depositPercent, amount: pkr(advance, lang) })} {fill(t.checkout.lockNote, { h: p.lockHours })}
              </span>
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
