"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useI18n } from "@/i18n/I18nProvider";
import { specLabel } from "@/lib/specLabels";
import type { Model } from "@/lib/types";
import { Reveal, ease } from "@/components/ui";

/** Factory photo gallery (inline viewer, no pop-up) and the full bilingual parameter table. */
export default function ProductDetails({ model }: { model: Model }) {
  const { t, tx } = useI18n();
  const photos = [...model.photos.gallery, ...(model.photos.banner ? [model.photos.banner] : [])];
  const [active, setActive] = useState(0);
  const table = model.specTable;
  if (!photos.length && !table.length) return null;
  const shown = photos[Math.min(active, photos.length - 1)];

  return (
    <section className="mx-auto max-w-[1600px] px-5 pb-12 pt-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        {photos.length > 0 && (
          <Reveal>
            <h2 className="font-display text-2xl font-semibold">{t.customize.gallery}</h2>
            <div className="mt-4 overflow-hidden rounded-md bg-[#f4f4f5]">
              <AnimatePresence mode="wait">
                <motion.img key={shown} src={shown} alt={model.name} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease }} className="aspect-[16/10] w-full object-cover" draggable={false} />
              </AnimatePresence>
            </div>
            <ul className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
              {photos.map((p, i) => (
                <li key={p}>
                  <button onClick={() => setActive(i)} aria-label={`${model.name} ${i + 1}`} aria-pressed={i === active} className={`block w-full overflow-hidden rounded border-2 transition ${i === active ? "border-[#111]" : "border-transparent opacity-70 hover:opacity-100"}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p} alt="" loading="lazy" className="aspect-square w-full object-cover" />
                  </button>
                </li>
              ))}
            </ul>
          </Reveal>
        )}
        <Reveal delay={0.1}>
          <h2 className="font-display text-2xl font-semibold">{t.customize.specsTitle}</h2>
          {model.specsEstimated && <p className="mt-2 rounded bg-[#fff7e6] px-3 py-2 text-xs text-[#8a5a00]">{t.customize.specsEstimated}</p>}
          {table.length > 0 ? (
            <div className="mt-4 overflow-hidden rounded-md border border-black/10">
              {table.map((g) => (
                <div key={g.group}>
                  <p className="bg-[#111] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white">{tx(specLabel(g.group))}</p>
                  <dl className="divide-y divide-black/5">
                    {g.items.map((i) => (
                      <div key={i.label} className="grid grid-cols-2 gap-3 px-4 py-2.5 text-sm">
                        <dt className="text-[#111]/60">{tx(specLabel(i.label))}</dt>
                        <dd className="latin font-medium text-[#111]">{i.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          ) : (
            <dl className="mt-4 divide-y divide-black/5 rounded-md border border-black/10 text-sm">
              {[
                [t.specs.topSpeed, `${model.specs.topSpeed} km/h`],
                [t.specs.range, `${model.specs.range} km`],
                [t.specs.motor, `${model.specs.motor} W`],
                [t.specs.charge, `${model.specs.charge} h`],
                [t.specs.weight, `${model.specs.weight} kg`],
              ].map(([l, v]) => (
                <div key={l} className="grid grid-cols-2 gap-3 px-4 py-2.5">
                  <dt className="text-[#111]/60">{l}</dt>
                  <dd className="latin font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </Reveal>
      </div>
    </section>
  );
}
