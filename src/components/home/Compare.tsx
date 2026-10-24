"use client";
import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { fill, pkr } from "@/lib/format";
import type { Model } from "@/lib/types";
import { useI18n } from "@/i18n/I18nProvider";
import ModelVisual from "@/components/vehicle/ModelVisual";
import { ChevronFwd } from "@/components/Icons";
import { Reveal, ease } from "@/components/ui";

const factoryValue = (m: Model, re: RegExp) => {
  for (const g of m.specTable) for (const i of g.items) if (re.test(i.label.trim())) return i.value.trim();
  return "";
};

/** Side-by-side comparison of up to three models. Figures come from the factory spec tables; prices are the site's base prices. */
export default function Compare({ models, colors }: { models: Model[]; colors: Record<string, string> }) {
  const { t, tx, lang } = useI18n();
  const slots = Math.min(3, models.length);
  // start with models that have complete factory figures
  const ranked = [...models].sort((a, b) => Number(a.specsEstimated) - Number(b.specsEstimated));
  const [pick, setPick] = useState<string[]>(() => ranked.slice(0, slots).map((m) => m.slug));
  if (!slots) return null;

  const rows = (m: Model) => {
    const type = factoryValue(m, /^battery type$/i);
    const cap = factoryValue(m, /^battery$/i);
    return [
      [t.specs.topSpeed, `${m.specs.topSpeed} km/h`],
      [t.specs.range, `${m.specs.range} km`],
      [t.specs.motor, `${m.specs.motor} W`],
      [t.compare.battery, [type, cap].filter(Boolean).join(" · ") || t.compare.na],
      [t.specs.charge, `${m.specs.charge} h`],
      [t.specs.weight, `${m.specs.weight} kg`],
      [t.compare.seatsOrLoad, m.specs.payload ? `${m.specs.payload} kg` : m.specs.seats ? String(m.specs.seats) : t.compare.na],
    ] as [string, string][];
  };

  return (
    <section id="compare" className="bg-[#f4f4f5] py-16 md:py-24">
      <Reveal y={20}>
        <h2 className="font-display mx-auto max-w-3xl px-5 text-center text-3xl font-semibold tracking-tight text-[#111] md:text-[44px]">{t.compare.title}</h2>
        <p className="mx-auto mt-3 max-w-xl px-5 text-center text-[15px] text-[#111]/55">{t.compare.text}</p>
      </Reveal>

      <ul className="mx-auto mt-12 flex max-w-[1240px] snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-6 [scrollbar-width:none] md:grid md:grid-cols-3 md:overflow-visible [&::-webkit-scrollbar]:hidden" data-lenis-prevent>
        {pick.map((slug, n) => {
          const m = models.find((x) => x.slug === slug) ?? models[0];
          return (
            <Reveal as="li" key={n} delay={n * 0.1} className="w-[86%] shrink-0 snap-center sm:w-[60%] md:w-auto">
              <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--volt)]/45 bg-gradient-to-br from-[#e6f9f0] via-white to-white p-6 shadow-[0_22px_50px_-28px_rgba(0,0,0,0.45)] md:p-8">
                <div className="flex items-center justify-between gap-3">
                  <span className="latin-d grid h-11 w-11 place-items-center rounded-full bg-[#111] text-lg font-bold text-white">{n + 1}</span>
                  <label className="min-w-0 flex-1 md:max-w-[220px]">
                    <span className="sr-only">{fill(t.compare.choose, { n: n + 1 })}</span>
                    <select
                      className="field latin !rounded-lg !py-2 text-sm font-semibold"
                      value={m.slug}
                      onChange={(e) => setPick((p) => p.map((s, k) => (k === n ? e.target.value : s)))}
                    >
                      {models.map((x) => (
                        <option key={x.slug} value={x.slug}>
                          {x.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div key={m.slug} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4, ease }} className="flex flex-1 flex-col">
                    <div className="mt-5">
                      <ModelVisual model={m} color={colors[m.defaultColor] ?? "#ccc"} reflection={false} className="aspect-[16/9] w-full" />
                    </div>
                    <h3 className="latin-d mt-2 text-2xl font-bold text-[#111] md:text-[28px]">{m.name}</h3>
                    <p className="mt-1 text-sm text-[#111]/55">{tx(m.tagline)}</p>

                    <dl className="mt-5 divide-y divide-black/10">
                      {rows(m).map(([label, value]) => (
                        <div key={label} className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-3 py-3 text-sm">
                          <dt className="text-[#111]/55">{label}</dt>
                          <dd className="latin font-semibold text-[#111]">{value}</dd>
                        </div>
                      ))}
                      <div className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-3 py-4 text-sm">
                        <dt className="self-center text-[#111]/55">{t.compare.pricing}</dt>
                        <dd className="font-display text-lg font-bold text-[#111]">{pkr(m.basePrice, lang)}</dd>
                      </div>
                    </dl>
                    <div className="mt-auto pt-6 text-center">
                      <Link href={`/customize/${m.slug}`} className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-md bg-[#111] px-9 text-[15px] font-semibold text-white transition hover:bg-black">
                        {t.compare.book} <ChevronFwd size={15} className="text-[var(--volt)]" />
                      </Link>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </Reveal>
          );
        })}
      </ul>
    </section>
  );
}
