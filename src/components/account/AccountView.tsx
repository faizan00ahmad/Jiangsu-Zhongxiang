"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n, useToast } from "@/i18n/I18nProvider";
import { CITIES } from "@/lib/catalog";
import { date, fill, pkr } from "@/lib/format";
import { api, configToQuery, deviceSetups, errorText, forgetDeviceQuotes, removeDeviceSetup, type DeviceSetup } from "@/lib/client";
import type { CityKey, Model, Order, Quote } from "@/lib/types";
import ModelVisual, { type VisualModel } from "@/components/vehicle/ModelVisual";
import OrderCard from "@/components/orders/OrderCard";
import { Reveal } from "@/components/ui";
import { Bookmark, Doc, Logout, Sliders, X } from "@/components/Icons";

type Props = {
  me: { name: string; phone: string; email: string | null; city: CityKey; createdAt: string };
  quotes: Quote[];
  orders: Order[];
  models: (VisualModel & Pick<Model, "slug">)[];
  colors: Record<string, string>;
};

export default function AccountView({ me, quotes, orders, models, colors }: Props) {
  const { t, tx, lang } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [local, setLocal] = useState<DeviceSetup[]>([]);
  useEffect(() => {
    const id = setTimeout(() => setLocal(deviceSetups()), 0);
    return () => clearTimeout(id);
  }, []);
  const byModel = (slug: string) => models.find((m) => m.slug === slug);
  const setups = quotes.filter((q) => q.label);

  async function remove(id: string) {
    const r = await api(`/api/quotes/${id}`, undefined, "DELETE");
    if (!r.ok) return toast(errorText(t, r.error), "error");
    router.refresh();
  }
  async function logout() {
    await api("/api/auth/logout", {});
    forgetDeviceQuotes();
    router.replace("/");
    router.refresh();
  }

  const quoteRow = (q: Quote) => {
    const m = byModel(q.model);
    return (
      <li key={q.id} className="glass grid items-center gap-4 rounded-3xl p-4 sm:grid-cols-[140px_1fr_auto]">
        {m && (
          <div className="stage rounded-2xl px-1 pt-1">
            <ModelVisual model={m} color={colors[q.config.color ?? ""] ?? "#ccc"} colorId={q.config.color} wheel={q.config.wheel} reflection={false} className="aspect-[1000/560] w-full" />
          </div>
        )}
        <div className="min-w-0">
          {q.label && <p className="truncate text-sm font-semibold text-[var(--volt)]">{q.label}</p>}
          <p className="latin-d font-semibold">{q.modelName}</p>
          <p className="text-sm text-ink/55">
            {t.common.quoteNo} <span className="latin">{q.id.slice(0, 8).toUpperCase()}</span> · {date(q.createdAt, lang)}
          </p>
          <p className="font-display mt-1 text-lg font-semibold">{pkr(q.total, lang)}</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:flex-col sm:items-stretch">
          <Link href={`/quote/${q.id}`} className="inline-flex items-center justify-center gap-1.5 rounded-full border border-ink/20 px-4 py-2 text-xs font-semibold hover:bg-ink hover:text-bg">
            <Doc size={14} /> {t.common.view}
          </Link>
          <Link href={`/customize/${q.model}?q=${q.id}`} className="inline-flex items-center justify-center gap-1.5 rounded-full border border-ink/20 px-4 py-2 text-xs font-semibold hover:bg-ink hover:text-bg">
            <Sliders size={14} /> {t.account.modify}
          </Link>
          <Link href={`/checkout/${q.id}`} className="inline-flex items-center justify-center rounded-full bg-[var(--volt)] px-4 py-2 text-xs font-bold text-black">
            {t.account.reorder}
          </Link>
          <button onClick={() => remove(q.id)} aria-label={t.common.remove} className="inline-flex items-center justify-center gap-1 rounded-full px-3 py-2 text-xs text-ink/50 hover:text-red-400">
            <X size={14} /> {t.common.remove}
          </button>
        </div>
      </li>
    );
  };

  return (
    <div className="mx-auto max-w-6xl px-5 pb-10 pt-32 md:pt-40">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-ink/50">{t.account.title}</p>
          <h1 className="font-display mt-2 text-4xl font-semibold md:text-6xl">{fill(t.account.hello, { name: me.name.split(" ")[0] })}</h1>
          <p className="mt-2 text-ink/55">
            <span className="latin" dir="ltr">{me.phone}</span> · {tx(CITIES[me.city])} · {fill(t.account.since, { date: date(me.createdAt, lang) })}
          </p>
        </div>
        <button onClick={logout} className="inline-flex h-11 items-center gap-2 rounded-full border border-ink/20 px-5 text-sm font-semibold hover:bg-ink/10">
          <Logout size={16} /> {t.nav.logout}
        </button>
      </div>

      {orders.length > 0 && (
        <section className="mt-14">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-semibold">{t.account.orders}</h2>
            <Link href="/orders" className="text-sm font-semibold text-[var(--volt)]">
              {t.orders.title} →
            </Link>
          </div>
          <div className="mt-5 space-y-4">
            {orders.slice(0, 3).map((o) => {
              const m = byModel(o.model);
              return m ? <OrderCard key={o.id} order={o} model={m} color={colors[o.config.color ?? ""] ?? "#ccc"} /> : null;
            })}
          </div>
        </section>
      )}

      <section className="mt-14">
        <h2 className="font-display flex items-center gap-2 text-2xl font-semibold">
          <Bookmark size={20} className="text-[var(--volt)]" /> {t.account.setups}
        </h2>
        {setups.length === 0 && local.length === 0 && <p className="mt-4 text-ink/55">{t.account.noSetups}</p>}
        <ul className="mt-5 space-y-3">
          {setups.map(quoteRow)}
        </ul>
        {local.length > 0 && (
          <div className="mt-6">
            <p className="text-sm font-semibold text-ink/60">{t.account.deviceSetups}</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {local.map((s) => (
                <li key={s.id} className="inline-flex items-center gap-2 rounded-full border border-ink/15 py-1 pe-1 ps-4 text-sm">
                  <Link href={`/customize/${s.model}?${configToQuery(s.config)}`} className="hover:text-[var(--volt)]">
                    {s.label}
                  </Link>
                  <button
                    onClick={() => {
                      removeDeviceSetup(s.id);
                      setLocal(deviceSetups());
                    }}
                    aria-label={t.common.remove}
                    className="grid h-7 w-7 place-items-center rounded-full hover:bg-ink/10"
                  >
                    <X size={12} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="mt-14">
        <Reveal>
          <h2 className="font-display text-2xl font-semibold">{t.account.quotes}</h2>
          <p className="mt-1 text-ink/55">{t.account.quotesText}</p>
        </Reveal>
        {quotes.length === 0 ? (
          <p className="mt-4 text-ink/55">{t.account.noQuotes}</p>
        ) : (
          <ul className="mt-5 space-y-3">
            {quotes.map(quoteRow)}
          </ul>
        )}
      </section>
    </div>
  );
}
