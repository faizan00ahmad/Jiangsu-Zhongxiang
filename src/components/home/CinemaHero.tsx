"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { pkr } from "@/lib/format";
import type { Model } from "@/lib/types";
import { useI18n } from "@/i18n/I18nProvider";
import { ease } from "@/components/ui";
import { ChevronFwd } from "@/components/Icons";

const SLIDES = [
  { slug: "r-xfx", glow: "255,59,59" },
  { slug: "r-jlong", glow: "96,150,255" },
  { slug: "retro-cg", glow: "92,207,122" },
];
const INTERVAL = 2000;
const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.55'/%3E%3C/svg%3E")`;

/** Full-screen night-road hero: fog, light bokeh, a lane-marked road with a glossy floor, the bike lit from behind, film grain and a vignette.
 *  A real photo dropped into /public/hero/<model-slug>.jpg (rider, helmet, motion blur) replaces the studio cut-out for that slide. */
export default function CinemaHero({ models, scenes = {} }: { models: Model[]; scenes?: Record<string, string> }) {
  const { t, tx, lang } = useI18n();
  const calm = useReducedMotion();
  const slides = SLIDES.map((s) => ({ ...s, model: models.find((m) => m.slug === s.slug) })).filter((s): s is typeof s & { model: Model } => !!s.model && !!(s.model.image ?? s.model.photos?.thumb));
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = slides.length;
  const go = useCallback((d: number) => setI((v) => (v + d + n) % n), [n]);

  useEffect(() => {
    if (paused || n < 2) return;
    const tm = setTimeout(() => go(1), INTERVAL);
    return () => clearTimeout(tm);
  }, [i, paused, n, go]);

  if (!n) return null;
  const { model: m, glow } = slides[i];
  const photo = (m.image ?? m.photos?.thumb) as string;
  const scene = scenes[m.slug];
  const dir = lang === "ur" ? -1 : 1;

  return (
    <section className="relative h-[100svh] max-h-[920px] min-h-[600px] w-full overflow-hidden bg-[#05070a] text-white" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} aria-roledescription="carousel" aria-label={t.home.seriesTitle}>
      {/* ── the night scene ── */}
      <AnimatePresence initial={false}>
        <motion.div key={`bg${i}`} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }}>
          <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 60% 38% at 62% 64%, rgba(${glow},0.42), transparent 72%), radial-gradient(ellipse 90% 50% at 50% 110%, rgba(${glow},0.18), transparent 70%), linear-gradient(180deg, #05070a 0%, #0a0d13 55%, #05070a 100%)` }} />
          {/* anamorphic streak behind the bike */}
          <div className="absolute inset-x-0 top-[26%] h-[2px] blur-[1px] lg:top-[58%]" style={{ background: `linear-gradient(90deg, transparent 5%, rgba(${glow},0.0) 15%, rgba(${glow},0.85) 62%, rgba(255,255,255,0.9) 66%, rgba(${glow},0.85) 70%, transparent 96%)` }} />
          <div className="absolute inset-x-0 top-[26%] h-16 -translate-y-1/2 blur-2xl lg:top-[58%]" style={{ background: `linear-gradient(90deg, transparent 20%, rgba(${glow},0.35) 66%, transparent 95%)` }} />
        </motion.div>
      </AnimatePresence>

      {!calm && (
        <>
          {/* city lights out of focus */}
          <div aria-hidden className="bokeh pointer-events-none absolute inset-x-0 top-[12%] h-[40%]">
            {[6, 17, 29, 38, 49, 58, 71, 83, 92].map((left, k) => (
              <span key={k} className="bokeh-dot absolute rounded-full" style={{ left: `${left}%`, top: `${(k * 37) % 70}%`, width: 18 + ((k * 13) % 34), height: 18 + ((k * 13) % 34), background: k % 3 === 0 ? `rgba(${glow},0.5)` : "rgba(255,214,150,0.4)", animationDelay: `${k * 0.4}s` }} />
            ))}
          </div>
          {/* fog drifting through the frame */}
          <div aria-hidden className="fog pointer-events-none absolute -inset-x-1/4 bottom-[8%] h-[46%] opacity-60" />
          {/* speed streaks */}
          <div aria-hidden className="speed pointer-events-none absolute inset-x-0 bottom-[20%] top-[26%] overflow-hidden opacity-80 [mask-image:linear-gradient(90deg,transparent,#000_30%,#000_85%,transparent)]">
            {[8, 22, 37, 52, 66, 80, 92].map((top, k) => (
              <span key={k} className="speed-line absolute h-px w-[42%] bg-gradient-to-r from-transparent via-white/55 to-transparent" style={{ top: `${top}%`, animationDelay: `${k * 0.19}s`, animationDuration: `${0.75 + (k % 3) * 0.3}s` }} />
            ))}
          </div>
        </>
      )}

      {/* a glossy road: lane dashes rushing toward the camera */}
      <div aria-hidden className="road pointer-events-none absolute inset-x-0 bottom-0 h-[34%] overflow-hidden [mask-image:linear-gradient(180deg,transparent,#000_45%)]">
        <div className="road-plane absolute inset-x-[-40%] bottom-[-20%] h-[150%]" style={{ ["--glow" as string]: glow }} />
      </div>

      {/* ── the bike (or a real rider photo) ── */}
      {scene ? (
        <AnimatePresence initial={false}>
          <motion.div key={`scene${m.slug}`} className="absolute inset-0" initial={{ opacity: 0, scale: 1.08 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8, ease }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={scene} alt={m.name} className="h-full w-full object-cover object-[70%_50%]" draggable={false} />
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/35 to-transparent rtl:bg-gradient-to-l" />
          </motion.div>
        </AnimatePresence>
      ) : (
        <div dir="ltr" className={`pointer-events-none absolute inset-0 flex items-start pt-20 sm:pt-24 lg:items-end lg:pt-0 ${lang === "ur" ? "justify-start" : "justify-end"}`}>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div key={m.slug} className="relative w-full px-4 lg:w-[62%] lg:px-0 xl:w-[58%]" initial={calm ? { opacity: 0 } : { x: dir * 260, opacity: 0, filter: "blur(22px)" }} animate={{ x: 0, opacity: 1, filter: "blur(0px)" }} exit={calm ? { opacity: 0 } : { x: dir * -180, opacity: 0, filter: "blur(16px)" }} transition={{ duration: 0.7, ease }}>
              <motion.div className="relative mx-auto w-fit max-w-full lg:mb-[5%]" initial={{ scale: 1 }} animate={{ scale: calm ? 1 : 1.05 }} transition={{ duration: 2.8, ease: "linear" }} style={{ transformOrigin: "50% 80%" }}>
                <div aria-hidden className="absolute inset-x-[10%] bottom-[2%] h-[7%] rounded-[50%] bg-black blur-lg" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo} alt={m.name} draggable={false} className="relative z-10 block max-h-[36svh] w-auto max-w-full sm:max-h-[42svh] lg:max-h-[72svh]" style={{ transform: dir === -1 ? "scaleX(-1)" : undefined, filter: `drop-shadow(0 0 26px rgba(${glow},0.38)) drop-shadow(0 28px 34px rgba(0,0,0,0.75)) contrast(1.06) saturate(1.08)` }} />
                {/* its mirror on the wet floor */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo} alt="" aria-hidden draggable={false} className="absolute left-0 top-[99%] z-0 h-auto w-full opacity-30 blur-[1.5px] [mask-image:linear-gradient(180deg,rgba(0,0,0,0.7),transparent_45%)]" style={{ transform: `scaleY(-1)${dir === -1 ? " scaleX(-1)" : ""}` }} />
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {/* ── grading: vignette, grain, soft floor black ── */}
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 85% 75% at 60% 52%, transparent 45%, rgba(0,0,0,0.85) 100%)" }} />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[24%] bg-gradient-to-t from-black via-black/60 to-transparent" />
      <div aria-hidden className="grain pointer-events-none absolute inset-0 opacity-[0.16] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />

      {/* ── copy ── */}
      <div className="relative z-20 mx-auto flex h-full max-w-[1440px] flex-col justify-end px-6 pb-24 pt-28 md:px-16 md:pb-28">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={m.slug} initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14, transition: { duration: 0.2 } }} transition={{ duration: 0.5, ease }} className="max-w-[640px]">
            <p className="latin-d text-[11px] font-bold uppercase tracking-[0.3em] md:text-xs" style={{ color: `rgb(${glow})` }}>
              {t.home.eyebrow}
            </p>
            <h1 className="font-display latin-d mt-3 text-[clamp(2.6rem,7.4vw,5.6rem)] font-black uppercase leading-[0.95] tracking-tight [text-shadow:0_4px_40px_rgba(0,0,0,0.7)]">{m.name}</h1>
            <p className="mt-3 max-w-md text-lg text-white/85 [text-shadow:0_2px_20px_rgba(0,0,0,0.8)] md:text-2xl">{tx(m.tagline)}</p>
            <p className="latin mt-3 text-sm text-white/60">
              {m.specs.topSpeed} km/h · {m.specs.range} km · {m.specs.motor} W · {t.common.from} <b className="font-semibold text-white">{pkr(m.basePrice, lang)}</b>
            </p>
            <Link href={`/customize/${m.slug}`} className="mt-7 inline-flex min-h-[52px] items-center gap-3 border border-white/80 bg-black/20 px-7 text-sm font-bold uppercase tracking-wide backdrop-blur-sm transition hover:bg-white hover:text-black" data-cursor={t.home.configure}>
              {t.home.discover} <ChevronFwd size={15} />
            </Link>
          </motion.div>
        </AnimatePresence>
      </div>

      {n > 1 && (
        <div className="absolute inset-x-0 bottom-8 z-30 flex justify-center gap-2" role="tablist" dir="ltr">
          {slides.map((s, k) => (
            <button key={s.slug} role="tab" aria-selected={k === i} aria-label={s.model.name} onClick={() => setI(k)} className="relative h-1 w-10 overflow-hidden rounded-full bg-white/25">
              {k === i && <motion.span key={`p${i}${paused}`} className="absolute inset-y-0 left-0 bg-white" initial={{ width: paused ? "100%" : 0 }} animate={{ width: "100%" }} transition={{ duration: paused ? 0 : INTERVAL / 1000, ease: "linear" }} />}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
