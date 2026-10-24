"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { KIND_META, KIND_ORDER } from "@/lib/catalog";
import { fill, pkr } from "@/lib/format";
import type { Model, Series, VehicleKind } from "@/lib/types";
import { useI18n } from "@/i18n/I18nProvider";
import ModelVisual from "@/components/vehicle/ModelVisual";
import Logo from "@/components/Logo";
import { Button, Reveal, SectionTitle, SpotCard, ease } from "@/components/ui";
import { Arrow, Back, Battery, Bolt, ChevronFwd, Clock, Gauge } from "@/components/Icons";

const BRAND = "ZX";

/** "Explore {brand} Products": brand in bold ink, the rest muted (or the leading words strong). */
function BrandTitle({ tpl, lead = "muted", className = "" }: { tpl: string; lead?: "muted" | "strong"; className?: string }) {
  const [before, after] = tpl.split("{brand}");
  return (
    <Reveal y={20}>
      <h2 className={`font-display text-center text-2xl font-semibold tracking-tight md:text-[34px] ${className}`}>
        <span className={lead === "strong" ? "text-[#111]" : "text-[#111]/45"}>{before}</span>
        <span className="latin-d font-extrabold text-[#111]">{BRAND}</span>
        <span className="text-[#111]/45">{after}</span>
      </h2>
    </Reveal>
  );
}

const PkFlag = () => (
  <svg width="20" height="14" viewBox="0 0 30 20" aria-hidden className="shrink-0 rounded-[2px]">
    <rect width="30" height="20" fill="#01411c" />
    <rect width="7.5" height="20" fill="#fff" />
    <circle cx="19" cy="10" r="5.2" fill="#fff" />
    <circle cx="20.4" cy="8.9" r="4.6" fill="#01411c" />
    <path d="m22.3 5.7.5 1.5h1.6l-1.3.9.5 1.5-1.3-.9-1.3.9.5-1.5-1.3-.9h1.6z" fill="#fff" />
  </svg>
);

/* ───────────── Explore products carousel ───────────── */
const SERIES_ORDER: Series[] = ["scooter", "motorcycle", "tricycle", "eec", "light", "bicycle"];

export function ExploreProducts({ models: all, colors }: { models: Model[]; colors: Record<string, string> }) {
  const { t, tx, lang } = useI18n();
  const seriesList = SERIES_ORDER.filter((s) => all.some((m) => m.series === s));
  const [series, setSeries] = useState<Series>(seriesList[0] ?? "scooter");
  const models = all.filter((m) => m.series === series);
  const [i, setI] = useState(0);
  const n = models.length;
  const m = models[Math.min(i, n - 1)];
  const go = useCallback((d: number) => setI((v) => (n ? (v + d + n) % n : 0)), [n]);
  const touch = useRef<number | null>(null);
  const dir = lang === "ur" ? -1 : 1;

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input,textarea,select")) return;
      const el = document.getElementById("explore");
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.top > innerHeight || r.bottom < 0) return;
      if (e.key === "ArrowRight") go(dir);
      if (e.key === "ArrowLeft") go(-dir);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [go, dir]);

  const offset = (k: number) => {
    let d = k - i;
    if (d > n / 2) d -= n;
    if (d < -n / 2) d += n;
    return d;
  };
  const maxRange = Math.round(m.specs.range * 1.75);
  const specs = [
    { I: Gauge, l: t.specs.topSpeed, v: `${m.specs.topSpeed} KM/H` },
    { I: Battery, l: t.specs.range, v: `${m.specs.range}-${maxRange} KM` },
    { I: Bolt, l: t.specs.motor, v: `${m.specs.motor} W` },
  ];

  return (
    <section id="explore" className="relative overflow-hidden bg-white pb-16 pt-16 md:pb-20 md:pt-20">
      <Reveal y={20}>
        <h2 className="font-display mx-auto max-w-3xl px-5 text-center text-3xl font-semibold leading-tight tracking-tight text-[#111] md:text-[44px]">{t.home.seriesTitle}</h2>
        <p className="mx-auto mt-3 max-w-xl px-5 text-center text-[15px] text-[#111]/55">{t.home.seriesText}</p>
      </Reveal>

      {/* series tabs */}
      <div className="mt-10 border-y border-black/5 bg-[#f5f5f6]">
        <div role="tablist" aria-label={t.home.seriesTitle} className="mx-auto flex max-w-5xl justify-start gap-1 overflow-x-auto px-3 [scrollbar-width:none] md:justify-center [&::-webkit-scrollbar]:hidden">
          {seriesList.map((s) => {
            const on = s === series;
            return (
              <button
                key={s}
                role="tab"
                aria-selected={on}
                onClick={() => {
                  setSeries(s);
                  setI(0);
                }}
                className={`relative shrink-0 px-5 py-4 text-[15px] transition-colors md:px-8 ${on ? "font-bold text-[#111]" : "font-medium text-[#111]/55 hover:text-[#111]"}`}
              >
                {t.series[s]}
                {on && <motion.span layoutId="series-underline" className="absolute inset-x-4 bottom-0 h-[3px] rounded-full bg-[var(--volt)]" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className="relative mx-auto mt-6 h-[230px] max-w-[1600px] select-none sm:h-[320px] md:h-[420px]"
        onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touch.current === null) return;
          const dx = e.changedTouches[0].clientX - touch.current;
          if (Math.abs(dx) > 40) go(dx < 0 ? dir : -dir);
          touch.current = null;
        }}
      >
        <div aria-hidden dir="ltr" className="latin-d watermark pointer-events-none absolute inset-x-0 top-1/2 -translate-y-[55%] select-none whitespace-nowrap text-center text-[19vw] font-black leading-none tracking-tight">
          ZHONGXIANG
        </div>
        {models.map((x, k) => {
          const d = offset(k);
          const far = Math.abs(d) > 1;
          return (
            <motion.button
              key={x.slug}
              aria-hidden={d !== 0}
              tabIndex={d === 0 ? -1 : far ? -1 : 0}
              aria-label={x.name}
              onClick={() => d !== 0 && setI(k)}
              className="absolute left-1/2 top-0 h-full w-[78%] sm:w-[58%] md:w-[52%]"
              initial={false}
              animate={{ x: `calc(-50% + ${d * dir * 88}%)`, scale: d === 0 ? 1 : 0.7, opacity: far ? 0 : 1, zIndex: d === 0 ? 2 : 1 }}
              transition={{ duration: 0.8, ease }}
              style={{ pointerEvents: far || d === 0 ? "none" : "auto" }}
            >
              <ModelVisual model={x} color={colors[x.defaultColor] ?? "#ccc"} rollKey={d === 0 ? x.slug : undefined} className="h-full w-full" />
            </motion.button>
          );
        })}
        {n > 1 && (
          <>
            <button onClick={() => go(-dir)} aria-label="Previous" className="absolute start-[4%] top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/15 text-white backdrop-blur transition hover:bg-black/60 sm:start-[12%] md:start-[10%]">
              <Back size={18} />
            </button>
            <button onClick={() => go(dir)} aria-label="Next" className="absolute end-[4%] top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/15 text-white backdrop-blur transition hover:bg-black/60 sm:end-[12%] md:end-[10%]">
              <Arrow size={18} />
            </button>
          </>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={m.slug} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.45, ease }} className="mt-8 text-center">
          <p className="latin-d text-3xl font-extrabold uppercase tracking-tight text-[#111] md:text-[40px]">{m.name}</p>
          <p className="mx-auto mt-1 max-w-md px-5 text-sm text-[#111]/55">{tx(m.tagline)}</p>
        </motion.div>
      </AnimatePresence>
      <dl className="mx-auto mt-8 grid max-w-2xl grid-cols-3 gap-4 px-5 text-center">
        {specs.map(({ I, l, v }) => (
          <div key={l}>
            <dt className="flex items-center justify-center gap-1.5 text-xs text-[#111]/50">
              <I size={14} className="text-[var(--volt)]" />
              {l}
            </dt>
            <AnimatePresence mode="wait">
              <motion.dd key={m.slug + l} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="latin-d mt-1 text-lg font-semibold text-[#111] md:text-[22px]">
                {v}
              </motion.dd>
            </AnimatePresence>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-center text-sm text-[#111]/55">
        {t.common.from} <b className="text-[#111]">{pkr(m.basePrice, lang)}</b>
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button href={`/customize/${m.slug}`}>{t.home.customizeBtn}</Button>
        <Button href="/inventory" variant="ghost">
          {t.home.stockBtn}
        </Button>
      </div>
      {n > 1 && (
        <div className="mt-6 flex justify-center gap-1.5" dir="ltr">
          {models.map((x, k) => (
            <button key={x.slug} onClick={() => setI(k)} aria-label={x.name} aria-current={k === i} className={`h-1.5 rounded-full transition-all ${k === i ? "w-8 bg-[#111]" : "w-4 bg-black/15 hover:bg-black/30"}`} />
          ))}
        </div>
      )}
    </section>
  );
}

/* ───────────── rider cards (one per vehicle family) ───────────── */
const SCENE: Record<VehicleKind, string> = {
  commuter: "linear-gradient(180deg,#cfe9f7 0%,#eaf4f8 55%,#c9c4bb 56%,#a9a397 100%)",
  sport: "linear-gradient(180deg,#f7d9c4 0%,#f5e8dc 55%,#4b4b50 56%,#2f2f33 100%)",
  cargo: "linear-gradient(180deg,#e8e2cf 0%,#f3efe2 55%,#b9a98a 56%,#9a8a6b 100%)",
  passenger: "linear-gradient(180deg,#d9e7d2 0%,#eef4ea 55%,#8e9188 56%,#6f726a 100%)",
};

export function Riders({ models, colors }: { models: Model[]; colors: Record<string, string> }) {
  const { t, tx } = useI18n();
  const cards = KIND_ORDER.map((k) => ({ k, m: models.find((x) => x.kind === k) })).filter((c): c is { k: VehicleKind; m: Model } => !!c.m);
  return (
    <section className="bg-[#f4f4f5] py-16 md:py-20">
      <BrandTitle tpl={t.home.ridersTitle} lead="strong" />
      <div className="mx-auto mt-10 max-w-[1200px] px-5">
        <ul className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 [scrollbar-width:none] md:mx-0 [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-4 md:overflow-visible md:px-0" data-lenis-prevent>
          {cards.map(({ k, m }, i) => (
            <Reveal as="li" key={k} delay={i * 0.08} className="w-[78%] shrink-0 snap-center sm:w-[46%] md:w-auto">
              <Link href={`/customize/${m.slug}`} className="group block h-full overflow-hidden rounded-md bg-white shadow-[0_10px_30px_-18px_rgba(0,0,0,0.3)] transition-transform duration-500 hover:-translate-y-2">
                <div className="relative overflow-hidden" style={{ background: SCENE[k] }}>
                  <div className="px-3 pt-8 transition-transform duration-700 group-hover:scale-105">
                    <ModelVisual model={m} color={colors[m.defaultColor] ?? "#ccc"} reflection={false} className="aspect-[1000/560] w-full" />
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span className="grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold text-white" style={{ background: KIND_META[k].accent }}>
                        {m.wheels}
                      </span>
                      <span className="text-sm font-semibold text-[#111]">{t.home.riders[k].title}</span>
                    </span>
                    <PkFlag />
                  </div>
                  <p className="mt-3 text-[13px] leading-relaxed text-[#111]/60">{t.home.riders[k].text}</p>
                  <p className="mt-3 text-xs font-semibold text-[#111]/45">
                    {tx(KIND_META[k].label)} · <span className="latin">{m.name}</span>
                  </p>
                </div>
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ───────────── how ordering works (the "stories" block) ───────────── */
export function Stories({ models, colors }: { models: Model[]; colors: Record<string, string> }) {
  const { t, tx } = useI18n();
  const hero = models.find((m) => m.kind === "cargo") ?? models[0];
  const links = ["/customize", "/orders", "/tracking"] as const;
  const tags = [t.nav.customize, t.nav.orders, t.nav.tracking];
  const thumbs = [models[0], models.find((m) => m.kind === "sport") ?? models[1], models.find((m) => m.kind === "passenger") ?? models[2]];
  return (
    <section className="bg-white py-16 md:py-20">
      <BrandTitle tpl={t.home.storiesTitle} />
      <div className="mt-4 flex justify-center">
        <Button href="/tracking" className="!min-h-[36px] !px-4 !text-[13px]">
          {t.home.more}
        </Button>
      </div>
      <div className="mx-auto mt-10 grid max-w-[1200px] gap-5 px-5 lg:grid-cols-[1.05fr_1fr]">
        <Reveal>
          <Link href="/tracking" className="group relative flex h-full min-h-[380px] flex-col overflow-hidden rounded-md bg-[#0e0f11] text-white">
            <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_70%_100%,#2b2f36_0%,#0e0f11_60%)]" />
            <div className="relative p-6 md:p-8">
              <Logo size="nav" tone="white" wordmark={false} />
              <div className="mt-6 border-s-2 border-white ps-4">
                <p className="font-display text-2xl font-semibold leading-tight md:text-3xl">{t.nav.tracking}</p>
                <p className="mt-2 max-w-sm text-sm text-white/65">{t.home.journeyText}</p>
              </div>
            </div>
            <div className="relative mt-auto px-6 pb-16 transition-transform duration-700 group-hover:scale-105">
              <ModelVisual model={hero} color={colors[hero.defaultColor] ?? "#ccc"} className="aspect-[1000/560] w-full" />
            </div>
            <div className="absolute inset-x-6 bottom-5 flex items-center justify-between">
              <span className="rounded border border-white/40 px-2.5 py-0.5 text-xs text-white/85">{tx({ en: "8 stages", ur: "8 مراحل" })}</span>
              <span className="grid h-8 w-8 place-items-center rounded-full border border-white/50 transition group-hover:bg-white group-hover:text-black">
                <ChevronFwd size={14} />
              </span>
            </div>
          </Link>
        </Reveal>
        <ul className="grid gap-5">
          {t.home.steps.map((s, k) => (
            <Reveal as="li" key={k} delay={k * 0.08}>
              <Link href={links[k]} className="group flex h-full items-center gap-4 rounded-md bg-white p-3 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.35)] transition hover:-translate-y-1">
                <span className="stage w-32 shrink-0 overflow-hidden rounded px-1 pt-2 sm:w-40">
                  <ModelVisual model={thumbs[k]} color={colors[thumbs[k].defaultColor] ?? "#ccc"} reflection={false} className="aspect-[1000/560] w-full transition-transform duration-500 group-hover:scale-105" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs text-[#111]/45">{fill(t.home.step, { n: k + 1 })}</span>
                  <span className="mt-1 block text-sm font-semibold leading-snug text-[#111]">{s}</span>
                  <span className="mt-2 inline-block rounded border border-black/15 px-2 py-0.5 text-[11px] text-[#111]/55">{tags[k]}</span>
                </span>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#111] text-white transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1">
                  <ChevronFwd size={14} className="text-[var(--volt)]" />
                </span>
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ───────────── two large cards ───────────── */
export function TwoCards({ models, colors }: { models: Model[]; colors: Record<string, string> }) {
  const { t } = useI18n();
  const a = models.find((m) => m.kind === "commuter") ?? models[0];
  const b = models.find((m) => m.kind === "passenger") ?? models[1];
  const cards = [
    { title: t.home.storeTitle, btn: t.home.storeBtn, href: "/inventory", m: a, scene: "linear-gradient(180deg,#bcd8ee 0%,#e7f0f6 52%,#d8d2c8 53%,#b5aea2 100%)" },
    { title: t.home.trackTitle, btn: t.nav.tracking, href: "/tracking", m: b, scene: "linear-gradient(180deg,#f1d5b5 0%,#f6ebdd 52%,#8d8a84 53%,#66645f 100%)" },
  ];
  return (
    <section className="bg-white pb-6">
      <div className="mx-auto grid max-w-[1200px] gap-5 px-5 md:grid-cols-2">
        {cards.map((c, k) => (
          <Reveal key={c.href} delay={k * 0.1}>
            <SpotCard tilt={2} className="overflow-hidden rounded-md bg-white shadow-[0_14px_40px_-22px_rgba(0,0,0,0.35)]">
              <div className="px-6 pb-6 pt-10 text-center">
                <h3 className="font-display text-lg font-semibold text-[#111] md:text-xl">{c.title}</h3>
                <div className="mt-4 flex justify-center">
                  <Button href={c.href} className="!min-h-[34px] !px-4 !text-[12px]">
                    {c.btn}
                  </Button>
                </div>
              </div>
              <div className="relative aspect-[4/3] overflow-hidden" style={{ background: c.scene }}>
                <div className="absolute inset-x-6 bottom-6">
                  <ModelVisual model={c.m} color={colors[c.m.defaultColor] ?? "#ccc"} reflection={false} className="aspect-[1000/560] w-full drop-shadow-[0_20px_20px_rgba(0,0,0,0.25)]" />
                </div>
              </div>
            </SpotCard>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ───────────── model grid (used by /customize) ───────────── */
export function ModelGrid({ models, colors, detailed = false }: { models: Model[]; colors: Record<string, string>; detailed?: boolean }) {
  const { t, tx, lang } = useI18n();
  const [f, setF] = useState<0 | 2 | 3>(0);
  const list = models.filter((m) => !f || m.wheels === f);
  const tabs: [0 | 2 | 3, string][] = [
    [0, t.common.all],
    [2, t.common.wheel2],
    [3, t.common.wheel3],
  ];
  return (
    <section id="models" className="relative py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          {detailed ? <h2 className="font-display text-2xl font-semibold">{t.customize.choose}</h2> : <SectionTitle title={t.home.modelsTitle} />}
          <div className="inline-flex self-start rounded-md border border-black/10 bg-white p-1 lg:self-auto" role="tablist">
            {tabs.map(([k, label]) => (
              <button key={k} role="tab" aria-selected={f === k} onClick={() => setF(k)} className="relative rounded px-5 py-2 text-sm font-semibold">
                {f === k && <motion.span layoutId="mtab" className="absolute inset-0 rounded bg-[#111]" transition={{ type: "spring", stiffness: 300, damping: 28 }} />}
                <span className={`relative ${f === k ? "text-white" : "text-[#111]/60"}`}>{label}</span>
              </button>
            ))}
          </div>
        </div>

        <motion.ul layout className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {list.map((m, i) => {
              const meta = KIND_META[m.kind];
              return (
                <motion.li key={m.slug} layout initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.55, delay: (i % 3) * 0.06, ease }}>
                  <Link href={`/customize/${m.slug}`} className="block h-full" data-cursor={t.home.configure}>
                    <SpotCard tilt={3} className="group flex h-full flex-col overflow-hidden rounded-md border border-black/5 bg-white shadow-[0_12px_36px_-24px_rgba(0,0,0,0.35)]" style={{ ["--accent" as string]: meta.accent, ["--accent-rgb" as string]: meta.glow } as React.CSSProperties}>
                      <div className="stage relative px-4 pt-8">
                        <span className="absolute start-4 top-4 rounded bg-[#111] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">{m.wheels === 2 ? t.common.wheel2 : t.common.wheel3}</span>
                        <div className="transition-transform duration-700 group-hover:scale-[1.05]">
                          <ModelVisual model={m} color={colors[m.defaultColor] ?? "#ccc"} reflection={false} className="aspect-[1000/560] w-full" />
                        </div>
                      </div>
                      <div className="flex flex-1 flex-col p-5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#111]/45">{tx(meta.label)}</p>
                        <h3 className="latin-d mt-1 text-xl font-semibold text-[#111]">{m.name}</h3>
                        <p className="mt-1 text-sm text-[#111]/55">{tx(m.tagline)}</p>
                        <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-black/5 pt-4 text-center">
                          {[
                            [Gauge, `${m.specs.topSpeed}`, t.specs.kmh],
                            [Battery, `${m.specs.range}+`, t.specs.km],
                            [Clock, `${m.specs.charge}`, t.specs.h],
                          ].map(([I, v, u], k) => {
                            const Icon = I as typeof Gauge;
                            return (
                              <div key={k}>
                                <Icon size={15} className="mx-auto text-[var(--volt)]" />
                                <dd className="latin-d mt-1 text-base font-semibold text-[#111]">{v as string}</dd>
                                <dt className="text-[11px] text-[#111]/45">{u as string}</dt>
                              </div>
                            );
                          })}
                        </dl>
                        {detailed && (
                          <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] text-[#111]/50">
                            <div>
                              <dt>{t.specs.motor}</dt>
                              <dd className="latin text-sm font-semibold text-[#111]">{m.specs.motor} W</dd>
                            </div>
                            <div>
                              <dt>{m.specs.payload ? t.specs.payload : t.specs.seats}</dt>
                              <dd className="latin text-sm font-semibold text-[#111]">{m.specs.payload ? `${m.specs.payload} kg` : m.specs.seats}</dd>
                            </div>
                            <div>
                              <dt>{t.specs.weight}</dt>
                              <dd className="latin text-sm font-semibold text-[#111]">{m.specs.weight} kg</dd>
                            </div>
                          </dl>
                        )}
                        <div className="mt-5 flex items-center justify-between">
                          <span className="text-sm text-[#111]/55">
                            {t.common.from} <b className="text-[#111]">{pkr(m.basePrice, lang)}</b>
                          </span>
                          <span className="inline-flex items-center gap-1 rounded bg-[#111] px-3 py-1.5 text-xs font-semibold text-white">
                            {t.home.customizeBtn} <ChevronFwd size={12} className="text-[var(--volt)]" />
                          </span>
                        </div>
                      </div>
                    </SpotCard>
                  </Link>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </motion.ul>
      </div>
    </section>
  );
}
