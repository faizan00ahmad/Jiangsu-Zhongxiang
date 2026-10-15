"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useI18n } from "@/i18n/I18nProvider";
import { CITIES, CITY_ORDER, KIND_META } from "@/lib/catalog";
import { fill } from "@/lib/format";
import type { CityKey, Dealer, Model, StockStatus } from "@/lib/types";
import ModelVisual from "@/components/vehicle/ModelVisual";
import { Reveal, SpotCard, ease } from "@/components/ui";
import { Arrow, Factory, Phone, Pin, Store } from "@/components/Icons";

const TONE: Record<StockStatus, string> = { in: "#2ee6a6", low: "#f5b40c", out: "#ff4d3d" };

type Row = { model: Model; qty: number; status: StockStatus };

export default function InventoryView({ factory, dealers, models, colors }: { factory: Row[]; dealers: Dealer[]; models: Model[]; colors: Record<string, string> }) {
  const { t, tx } = useI18n();
  const [tab, setTab] = useState<"factory" | "dealers">("factory");
  const [region, setRegion] = useState("");
  const [city, setCity] = useState<CityKey | "">("");
  const [model, setModel] = useState("");

  const regions = useMemo(() => [...new Set(CITY_ORDER.map((c) => CITIES[c].region.en))], []);
  const cities = CITY_ORDER.filter((c) => (!region || CITIES[c].region.en === region) && dealers.some((d) => d.city === c));
  const shown = dealers.filter((d) => (!city || d.city === city) && (!region || CITIES[d.city].region.en === region) && (!model || (d.stock[model] ?? 0) > 0));

  return (
    <div className="mx-auto max-w-7xl px-5">
      <div className="inline-flex rounded-full border border-ink/15 bg-card/60 p-1" role="tablist">
        {(["factory", "dealers"] as const).map((k) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className="relative flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold">
            {tab === k && <motion.span layoutId="invtab" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 300, damping: 28 }} />}
            <span className={`relative flex items-center gap-2 ${tab === k ? "text-bg" : "text-ink/70"}`}>
              {k === "factory" ? <Factory size={16} /> : <Store size={16} />}
              {k === "factory" ? t.inventory.factory : t.inventory.dealers}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "factory" ? (
          <motion.section key="f" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.5, ease }} className="mt-8">
            <p className="max-w-2xl text-ink/60">{t.inventory.factoryText}</p>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {factory.map(({ model: m, qty, status }, i) => {
                const meta = KIND_META[m.kind];
                return (
                  <Reveal as="li" key={m.slug} delay={(i % 3) * 0.06}>
                    <SpotCard tilt={3} className="glass flex h-full items-center gap-4 rounded-3xl p-4" style={{ ["--accent" as string]: meta.accent, ["--accent-rgb" as string]: meta.glow } as React.CSSProperties}>
                      <div className="stage w-32 shrink-0 rounded-2xl px-1 pt-1">
                        <ModelVisual model={m} color={colors[m.defaultColor] ?? "#ccc"} reflection={false} className="aspect-[1000/560] w-full" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="latin-d truncate font-semibold">{m.name}</p>
                        <p className="text-xs text-ink/55">{m.wheels === 2 ? t.common.wheel2 : t.common.wheel3}</p>
                        <p className="mt-2 inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: `${TONE[status]}1f`, color: TONE[status] }}>
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: TONE[status] }} />
                          {t.inventory.status[status]}
                          {status !== "out" && <span className="latin font-medium opacity-80">· {qty === 1 ? t.common.unit : fill(t.common.units, { n: qty })}</span>}
                        </p>
                      </div>
                      {status !== "out" && (
                        <Link href={`/customize/${m.slug}`} aria-label={`${t.customize.start} ${m.name}`} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-black">
                          <Arrow size={16} />
                        </Link>
                      )}
                    </SpotCard>
                  </Reveal>
                );
              })}
            </ul>
          </motion.section>
        ) : (
          <motion.section key="d" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.5, ease }} className="mt-8">
            <p className="max-w-2xl text-ink/60">{t.inventory.dealersText}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="mb-1.5 block text-sm text-ink/70">{t.inventory.region}</span>
                <select
                  className="field"
                  value={region}
                  onChange={(e) => {
                    setRegion(e.target.value);
                    setCity("");
                  }}
                >
                  <option value="">{t.inventory.allRegions}</option>
                  {regions.map((r) => {
                    const c = CITY_ORDER.find((x) => CITIES[x].region.en === r)!;
                    return (
                      <option key={r} value={r}>
                        {tx(CITIES[c].region)}
                      </option>
                    );
                  })}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm text-ink/70">{t.inventory.city}</span>
                <select className="field" value={city} onChange={(e) => setCity(e.target.value as CityKey)}>
                  <option value="">{t.inventory.allCities}</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>
                      {tx(CITIES[c])}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm text-ink/70">{t.inventory.model}</span>
                <select className="field" value={model} onChange={(e) => setModel(e.target.value)}>
                  <option value="">{t.inventory.allModels}</option>
                  {models.map((m) => (
                    <option key={m.slug} value={m.slug}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="mt-4 text-sm text-ink/55">{fill(t.inventory.stores, { n: shown.length })}</p>
            {shown.length === 0 && <p className="mt-6 rounded-2xl border border-ink/10 p-6 text-center text-ink/60">{t.inventory.noResults}</p>}
            <ul className="mt-4 grid gap-4 lg:grid-cols-2">
              {shown.map((d, i) => {
                const items = models.filter((m) => (d.stock[m.slug] ?? 0) > 0 && (!model || m.slug === model));
                const total = models.reduce((s, m) => s + (d.stock[m.slug] ?? 0), 0);
                return (
                  <Reveal as="li" key={d.id} delay={(i % 2) * 0.06}>
                    <div className="glass h-full rounded-3xl p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="flex items-center gap-2 font-semibold">
                            <Store size={16} className="text-[var(--amber)]" />
                            {tx(d.name)}
                          </p>
                          <p className="mt-1 flex gap-2 text-sm text-ink/55">
                            <Pin size={14} className="mt-1 shrink-0" />
                            {tx(d.address)}
                          </p>
                        </div>
                        <span className="rounded-full bg-ink/[0.07] px-3 py-1 text-xs font-semibold">{tx(CITIES[d.city])}</span>
                      </div>
                      <p className="mt-3 text-sm font-semibold text-[var(--volt)]">{fill(t.inventory.ready, { n: total })}</p>
                      {items.length === 0 ? (
                        <p className="mt-3 text-sm text-ink/50">{t.inventory.noStock}</p>
                      ) : (
                        <ul className="mt-3 flex flex-wrap gap-2">
                          {items.map((m) => (
                            <li key={m.slug} className="latin inline-flex items-center gap-2 rounded-full border border-ink/12 px-3 py-1.5 text-xs">
                              <span className="h-2 w-2 rounded-full" style={{ background: KIND_META[m.kind].accent }} />
                              {m.name}
                              <b>×{d.stock[m.slug]}</b>
                            </li>
                          ))}
                        </ul>
                      )}
                      <a href={`tel:${d.phone.replace(/\s/g, "")}`} className="mt-4 inline-flex items-center gap-2 rounded-full border border-ink/20 px-4 py-2 text-sm font-semibold hover:bg-ink hover:text-bg">
                        <Phone size={14} />
                        {t.inventory.call} · <span className="latin" dir="ltr">{d.phone}</span>
                      </a>
                    </div>
                  </Reveal>
                );
              })}
            </ul>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
