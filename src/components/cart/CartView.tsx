"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, errorText } from "@/lib/client";
import { CITIES, CITY_ORDER } from "@/lib/catalog";
import { fill, pkr } from "@/lib/format";
import { zoneFor, type ZoneInfo } from "@/lib/shipping";
import { useI18n, useToast } from "@/i18n/I18nProvider";
import type { CartLine, CartView as View } from "@/lib/server/checkout";
import type { CityKey, Model } from "@/lib/types";
import ModelVisual, { type VisualModel } from "@/components/vehicle/ModelVisual";
import { Approx } from "@/components/Currency";
import { Notice } from "@/components/ui";
import { CartIcon } from "@/components/Icons";
import { useCart, type CartEntry } from "./CartProvider";

type Priced = { view: View; depositPercent: number; deposit: number };

/** The cart page. Every number comes from the server (it prices the quotation ids again), so a changed price or an empty shelf shows up here, not at the last step. */
export default function CartView({ models, colors, zones, myCity }: { models: (VisualModel & Pick<Model, "slug">)[]; colors: Record<string, string>; zones: ZoneInfo[]; myCity: CityKey | null }) {
  const { t, tx, lang } = useI18n();
  const toast = useToast();
  const { items, loggedIn, setQty, remove } = useCart();
  const [data, setData] = useState<Priced | null>(null);
  const [busy, setBusy] = useState(false);
  const [city, setCity] = useState<CityKey | "">(myCity ?? "");
  const key = useMemo(() => items.map((i) => `${i.id ?? ""}:${i.quoteId}:${i.qty}`).join("|"), [items]);

  const load = useCallback(async () => {
    const r = await api<{ view: View; depositPercent: number; deposit: number }>("/api/cart/price", { items: items.map((i) => ({ id: i.id, quoteId: i.quoteId, qty: i.qty })) });
    if (r.ok) setData({ view: r.view, depositPercent: r.depositPercent, deposit: r.deposit });
  }, [items]);
  useEffect(() => {
    // priced again whenever the cart changes
    const id = setTimeout(() => void load(), 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  async function change(e: CartEntry, qty: number) {
    setBusy(true);
    const r = await setQty(e, qty);
    setBusy(false);
    if (!r.ok) toast(errorText(t, r.error), "error");
  }
  async function drop(e: CartEntry) {
    setBusy(true);
    await remove(e);
    setBusy(false);
  }
  const entryOf = (l: CartLine): CartEntry | undefined => items.find((i) => (i.id ? i.id === l.id : i.quoteId === l.quoteId));

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-5 pb-24 pt-8 text-center">
        <CartIcon size={44} className="mx-auto text-ink/30" />
        <h2 className="font-display mt-4 text-2xl font-semibold">{t.cart.empty}</h2>
        <p className="mt-2 text-ink/60">{t.cart.emptyText}</p>
        <Link href="/customize" className="mt-6 inline-flex h-12 items-center rounded-full bg-[#111] px-7 text-sm font-semibold text-white">
          {t.cart.emptyCta}
        </Link>
      </div>
    );
  }
  if (!data) return <p className="px-5 py-20 text-center text-ink/55">{t.cart.loading}</p>;

  const { view, depositPercent, deposit } = data;
  const zone = zoneFor(zones, city || null);
  const visual = (slug: string) => models.find((m) => m.slug === slug);
  const total = view.subtotal;

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-5 pb-24 lg:grid-cols-[1fr_380px]" aria-busy={busy}>
      <ul className="space-y-4">
        {view.lines.map((l) => {
          const m = visual(l.slug);
          const e = entryOf(l);
          const extras = l.lines.filter((x) => x.price > 0).map((x) => tx(x.label));
          return (
            <li key={l.id + l.quoteId} className="glass grid gap-4 rounded-3xl p-4 sm:grid-cols-[170px_1fr]">
              {m ? (
                <div className="stage rounded-2xl px-1 pt-1">
                  <ModelVisual model={m} color={colors[l.config.color ?? ""] ?? m.colors?.[0]?.hex ?? "#ccc"} colorId={l.config.color} wheel={l.config.wheel} reflection={false} className="aspect-[1000/560] w-full" />
                </div>
              ) : (
                <div className="stage rounded-2xl" />
              )}
              <div className="min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="latin-d text-lg font-semibold">{l.name || "—"}</p>
                    {extras.length > 0 && <p className="mt-0.5 text-xs text-ink/55">{extras.join(" · ")}</p>}
                  </div>
                  <p className="text-end">
                    <span className="font-display block text-lg font-bold">{pkr(l.total, lang)}</span>
                    {l.qty > 1 && <span className="block text-xs text-ink/50">{pkr(l.unit, lang)} {t.cart.each}</span>}
                  </p>
                </div>
                {l.problem && <Notice tone="error" className="mt-3">{fill(t.cart.problem[l.problem], { n: l.stock })}</Notice>}
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <div className="inline-flex items-center rounded-full border border-ink/20" role="group" aria-label={t.cart.qty}>
                    <button type="button" disabled={busy || !e || l.qty <= 1} onClick={() => e && change(e, l.qty - 1)} aria-label="−" className="grid h-9 w-9 place-items-center rounded-full text-lg hover:bg-ink/10 disabled:opacity-40">−</button>
                    <span className="latin w-8 text-center text-sm font-semibold tabular-nums" aria-live="polite">{l.qty}</span>
                    <button type="button" disabled={busy || !e || l.qty >= 5} onClick={() => e && change(e, l.qty + 1)} aria-label="+" className="grid h-9 w-9 place-items-center rounded-full text-lg hover:bg-ink/10 disabled:opacity-40">+</button>
                  </div>
                  <Link href={`/customize/${l.slug}?q=${l.quoteId}`} className="text-sm font-semibold underline">{t.cart.modify}</Link>
                  <button type="button" disabled={busy || !e} onClick={() => e && drop(e)} className="ms-auto text-sm font-semibold text-red-600 hover:underline disabled:opacity-40">{t.cart.remove}</button>
                </div>
              </div>
            </li>
          );
        })}
        <li>
          <Link href="/customize" className="inline-flex text-sm font-semibold underline">+ {t.cart.more}</Link>
        </li>
      </ul>

      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="glass rounded-3xl p-6">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-ink/60">{view.units === 1 ? t.cart.oneBike : fill(t.cart.bikes, { n: view.units })}</dt>
              <dd>{t.cart.subtotal}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="font-semibold">{t.common.total}</dt>
              <dd className="font-display text-2xl font-bold">{pkr(total, lang)}</dd>
            </div>
            <div className="text-end"><Approx pkr={total} className="!text-xs" /></div>
            <div className="flex justify-between gap-3 pt-1">
              <dt className="text-ink/60">{fill(t.cart.advance, { p: depositPercent })}</dt>
              <dd className="font-semibold text-[var(--accent)]">{pkr(deposit, lang)}</dd>
            </div>
          </dl>

          <label className="mt-5 block text-sm">
            <span className="mb-1.5 block text-ink/70">{t.cart.deliveryTo}</span>
            <select className="field" value={city} onChange={(e) => setCity(e.target.value as CityKey)}>
              <option value="">{t.cart.chooseCity}</option>
              {CITY_ORDER.map((c) => (
                <option key={c} value={c}>{tx(CITIES[c])}</option>
              ))}
            </select>
          </label>
          {zone && (
            <p className="mt-2 rounded-2xl bg-ink/[0.05] p-3 text-xs leading-relaxed text-ink/65">
              {fill(t.checkout.shipEstimate, { cost: pkr(zone.baseCost, lang), days: zone.extraDays })} {t.checkout.shipNote}
            </p>
          )}

          {view.units > 10 && <Notice tone="error" className="mt-4">{fill(t.cart.limit, { n: 10 })}</Notice>}
          {view.ok ? (
            <Link href={loggedIn ? "/checkout" : "/login?next=/checkout"} className="mt-5 flex h-12 items-center justify-center rounded-full bg-[#111] text-sm font-semibold text-white transition hover:bg-black">
              {t.cart.checkout}
            </Link>
          ) : (
            <button type="button" disabled className="mt-5 flex h-12 w-full items-center justify-center rounded-full bg-[#111] text-sm font-semibold text-white opacity-50">
              {t.cart.checkout}
            </button>
          )}
          {!loggedIn && <p className="mt-3 text-center text-xs text-ink/55">{t.cart.loginNote}</p>}
        </div>
      </aside>
    </div>
  );
}
