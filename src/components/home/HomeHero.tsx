"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { pkr } from "@/lib/format";
import type { L, Model } from "@/lib/types";
import { useI18n } from "@/i18n/I18nProvider";
import ModelVisual from "@/components/vehicle/ModelVisual";
import { ease } from "@/components/ui";
import { Back, Arrow } from "@/components/Icons";

const PER = 4;
const INTERVAL = 6500;

/** Grey line-up banner (REVOO style): bold italic headline, four models per slide with their price tags. */
export default function HomeHero({ models, colors, title, text }: { models: Model[]; colors: Record<string, string>; title: L; text: L }) {
  const { t, tx, lang } = useI18n();
  const pages = Math.max(1, Math.ceil(models.length / PER));
  const [p, setP] = useState(0);
  const [paused, setPaused] = useState(false);
  const go = useCallback((d: number) => setP((v) => (v + d + pages) % pages), [pages]);
  const shown = Array.from({ length: Math.min(PER, models.length) }, (_, i) => models[(p * PER + i) % models.length]);

  useEffect(() => {
    if (paused || pages < 2) return;
    const tm = setTimeout(() => go(1), INTERVAL);
    return () => clearTimeout(tm);
  }, [p, paused, pages, go]);

  return (
    <section className="banner relative overflow-hidden pt-16" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} aria-roledescription="carousel">
      <div className="mx-auto max-w-[1440px] px-5 pb-24 pt-10 md:px-16 md:pt-12">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease }} className="text-center">
          <h1 className={`font-display mx-auto max-w-4xl text-[clamp(2.2rem,6vw,4.6rem)] font-black leading-[0.95] text-[#111] ${lang === "ur" ? "" : "-skew-x-6 uppercase italic"}`}>{tx(title)}</h1>
          <p className={`mx-auto mt-3 max-w-xl text-sm text-[#111]/70 md:text-base ${lang === "ur" ? "" : "italic"}`}>{tx(text)}</p>
        </motion.div>

        <div className="relative mt-8">
          <AnimatePresence mode="wait" initial={false}>
            <motion.ul key={p} className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4" initial="out" animate="in" exit="gone">
              {shown.map((m, i) => (
                <motion.li
                  key={`${p}-${m.slug}`}
                  variants={{ out: { opacity: 0, x: lang === "ur" ? -60 : 60 }, in: { opacity: 1, x: 0, transition: { delay: i * 0.08, duration: 0.7, ease } }, gone: { opacity: 0, x: lang === "ur" ? 60 : -60, transition: { duration: 0.3 } } }}
                >
                  <Link href={`/customize/${m.slug}`} className="group block" data-cursor={t.home.configure}>
                    <div className="transition-transform duration-500 group-hover:-translate-y-2">
                      <ModelVisual model={m} color={colors[m.defaultColor] ?? "#ccc"} reflection={false} rollKey={`${p}-${m.slug}`} className="aspect-[1000/560] w-full drop-shadow-[0_18px_18px_rgba(0,0,0,0.18)]" />
                    </div>
                    <div className="mt-2 px-1">
                      <p className="latin-d text-xl font-bold leading-tight text-[#111] md:text-[28px]">{m.name.replace(/^ZX\s/, "")}</p>
                      <div className="mt-2 inline-flex flex-col border border-[#111]/70 bg-white/70 px-2 py-1">
                        <span className="text-[9px] font-semibold uppercase leading-none tracking-wider text-[#111]/60">{t.common.from}</span>
                        <span className="latin-d text-[15px] font-extrabold leading-tight text-[#111] md:text-lg">{pkr(m.basePrice, "en").replace("PKR ", "")}</span>
                      </div>
                    </div>
                  </Link>
                </motion.li>
              ))}
            </motion.ul>
          </AnimatePresence>

          {pages > 1 && (
            <>
              <button onClick={() => go(-1)} aria-label="Previous" className="absolute -start-12 top-[22%] hidden h-10 w-10 place-items-center rounded-full bg-black/25 text-white backdrop-blur transition hover:bg-black/60 lg:grid">
                <Back size={18} />
              </button>
              <button onClick={() => go(1)} aria-label="Next" className="absolute -end-12 top-[22%] hidden h-10 w-10 place-items-center rounded-full bg-black/25 text-white backdrop-blur transition hover:bg-black/60 lg:grid">
                <Arrow size={18} />
              </button>
            </>
          )}
        </div>

        {pages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2" role="tablist" dir="ltr">
            <button onClick={() => go(-1)} aria-label="Previous" className="me-2 grid h-8 w-8 place-items-center rounded-full bg-black/25 text-white lg:hidden">
              <Back size={15} className="rtl:scale-x-100" />
            </button>
            {Array.from({ length: pages }, (_, k) => (
              <button key={k} role="tab" aria-selected={k === p} aria-label={`${k + 1}`} onClick={() => setP(k)} className="relative h-1.5 w-10 overflow-hidden rounded-full bg-black/15">
                {k === p && <motion.span key={`b${p}${paused}`} className="absolute inset-y-0 left-0 bg-[#111]" initial={{ width: paused ? "100%" : 0 }} animate={{ width: "100%" }} transition={{ duration: paused ? 0 : INTERVAL / 1000, ease: "linear" }} />}
              </button>
            ))}
            <button onClick={() => go(1)} aria-label="Next" className="ms-2 grid h-8 w-8 place-items-center rounded-full bg-black/25 text-white lg:hidden">
              <Arrow size={15} className="rtl:scale-x-100" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
