"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { KIND_META } from "@/lib/catalog";
import { fill, pkr, signedPkr } from "@/lib/format";
import { STD_COLOR, defaultConfig, priceQuote } from "@/lib/pricing";
import type { Config, GroupKey, Model, OptionGroup, StockStatus } from "@/lib/types";
import { api, configToQuery, deviceSetups, errorText, rememberQuote, saveDeviceSetup, type DeviceSetup } from "@/lib/client";
import { useI18n, useToast } from "@/i18n/I18nProvider";
import Vehicle, { WheelSwatch } from "@/components/vehicle/Vehicle";
import ModelVisual from "@/components/vehicle/ModelVisual";
import RecolorImage from "@/components/vehicle/RecolorImage";
import ProductDetails from "./ProductDetails";
import { Button, TweenNumber, ease } from "@/components/ui";
import { Battery, Bookmark, Bolt, Check, Clock, Doc, Gauge, Refresh, User } from "@/components/Icons";

type Props = {
  model: Model;
  models: Model[];
  options: OptionGroup[];
  colors: Record<string, string>;
  initial: Config;
  fromQuote: string | null;
  loggedIn: boolean;
  stock: StockStatus;
};

const STOCK_TONE: Record<StockStatus, string> = { in: "#2ee6a6", low: "#f5b40c", out: "#ff4d3d" };

export default function Configurator({ model, models, options, colors, initial, fromQuote, loggedIn, stock }: Props) {
  const { t, tx, lang } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [config, setConfig] = useState<Config>(initial);
  const [busy, setBusy] = useState<"" | "quote" | "save">("");
  const [naming, setNaming] = useState(false);
  const [label, setLabel] = useState("");
  const [local, setLocal] = useState<DeviceSetup[]>([]);
  const meta = KIND_META[model.kind];
  const priced = useMemo(() => priceQuote(model, options, config), [model, options, config]);
  const paint = model.colors.find((c) => c.id === priced.config.color);
  const color = paint?.hex ?? colors[priced.config.color ?? model.defaultColor] ?? "#cfd4dc";
  const paintPhoto = paint?.image ?? null;
  const realThumb = model.image ?? model.photos.thumb;
  const [recolorable, setRecolorable] = useState(true);
  const asShot = priced.config.color === STD_COLOR || !recolorable; // photo shown untouched
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = setTimeout(() => setLocal(deviceSetups().filter((s) => s.model === model.slug)), 0);
    return () => clearTimeout(id);
  }, [model.slug]);
  // the build lives in the URL so a refresh keeps it and it can be shared
  useEffect(() => {
    window.history.replaceState(null, "", `/customize/${model.slug}?${configToQuery(priced.config)}`);
  }, [model.slug, priced.config]);
  useEffect(() => {
    if (naming) nameRef.current?.focus();
  }, [naming]);

  const pick = (k: GroupKey, id: string) => setConfig((c) => ({ ...c, [k]: id }));
  const reset = () => {
    setConfig(defaultConfig(model, options));
    toast(t.customize.resetDone, "info");
  };

  async function quote() {
    setBusy("quote");
    const r = await api<{ id: string }>("/api/quotes", { model: model.slug, config: priced.config });
    if (!r.ok) {
      setBusy("");
      return toast(errorText(t, r.error), "error");
    }
    rememberQuote(r.id);
    router.push(`/quote/${r.id}`);
  }

  async function save() {
    const name = label.trim() || `${model.name} · ${pkr(priced.total)}`;
    if (!loggedIn) {
      const s: DeviceSetup = { id: `${Date.now()}`, model: model.slug, modelName: model.name, config: priced.config, label: name, total: priced.total, at: new Date().toISOString() };
      saveDeviceSetup(s);
      setLocal((l) => [s, ...l]);
      setNaming(false);
      setLabel("");
      return toast(t.customize.savedLocal, "ok");
    }
    setBusy("save");
    const r = await api<{ id: string }>("/api/quotes", { model: model.slug, config: priced.config, label: name });
    setBusy("");
    if (!r.ok) return toast(errorText(t, r.error), "error");
    rememberQuote(r.id);
    setNaming(false);
    setLabel("");
    toast(t.customize.saved, "ok");
  }

  const spec = [
    { I: Battery, v: priced.range, u: t.specs.km, l: t.customize.estRange, live: true },
    { I: Gauge, v: model.specs.topSpeed, u: t.specs.kmh, l: t.specs.topSpeed },
    { I: Bolt, v: model.specs.motor, u: t.specs.w, l: t.specs.motor },
    { I: Clock, v: model.specs.charge, u: t.specs.h, l: t.specs.charge },
    model.specs.payload ? { I: Doc, v: model.specs.payload, u: t.specs.kg, l: t.specs.payload } : { I: User, v: model.specs.seats ?? 1, u: "", l: t.specs.seats },
  ];

  return (
    <section className="relative" style={{ ["--accent" as string]: meta.accent, ["--accent-rgb" as string]: meta.glow } as React.CSSProperties}>
      <div className="mx-auto grid max-w-[1600px] grid-cols-[minmax(0,1fr)] gap-0 pt-24 lg:grid-cols-[minmax(0,1fr)_460px] lg:pt-24">
        {/* ── stage ── */}
        <div className="relative lg:sticky lg:top-24 lg:h-[calc(100vh-12.5rem)]">
          <div className="stage relative isolate mx-3 flex h-full min-h-[420px] flex-col overflow-hidden rounded-[2rem] border border-ink/10 sm:mx-5 lg:me-0">
            <div className="aurora -z-10">
              <i />
              <i />
              <i />
            </div>
            <div className="flex flex-wrap items-start justify-between gap-3 p-5 md:p-8">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.25em]" style={{ color: meta.accent }}>
                  {tx(meta.label)}
                </p>
                <AnimatePresence mode="wait">
                  <motion.h1 key={model.slug} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.5, ease }} className="font-display latin-d mt-1 text-4xl font-semibold tracking-tight md:text-6xl">
                    {model.name}
                  </motion.h1>
                </AnimatePresence>
                <p className="mt-1 text-ink/60">{tx(model.tagline)}</p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-card/60 px-3 py-1.5 text-xs font-semibold backdrop-blur">
                <span className="h-2 w-2 rounded-full" style={{ background: STOCK_TONE[stock] }} />
                {t.checkout.factoryStock}: {t.inventory.status[stock]}
              </span>
            </div>

            {paintPhoto ? (
              <>
                {/* real studio photo of the selected paint, cross-fading between colours */}
                <AnimatePresence initial={false}>
                  <motion.img
                    key={paintPhoto}
                    src={paintPhoto}
                    alt={`${model.name} — ${tx(priced.lines.find((l) => l.group === "color")?.label ?? { en: "", ur: "" })}`}
                    initial={{ opacity: 0, scale: 1.04 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.7, ease }}
                    className="absolute inset-0 -z-10 h-full w-full object-cover"
                    draggable={false}
                  />
                </AnimatePresence>
                <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-white/75 to-transparent" />
                <div className="flex-1" />
              </>
            ) : realThumb ? (
              <div className="relative flex flex-1 flex-col items-center justify-center px-4 pb-8">
                {/* no per-colour photos for this model: the real photo is repainted in the chosen colour */}
                <RecolorImage src={realThumb} color={asShot ? null : color} alt={model.name} imgClassName="max-h-[48vh] max-w-[860px]" onAnalysis={setRecolorable} />
                <p className="absolute inset-x-4 bottom-2 text-center text-[11px] text-ink/55">{asShot ? t.customize.paintNoteStd : t.customize.paintNote}</p>
              </div>
            ) : (
              <div className="relative flex flex-1 items-center justify-center px-2">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div key={model.slug} initial={{ x: "-60%", opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: "60%", opacity: 0 }} transition={{ duration: 1.2, ease }} className="w-full max-w-[980px]">
                    <Vehicle kind={model.kind} variant={model.variant} color={color} wheel={priced.config.wheel} accent={meta.accent} rollKey={model.slug} className="aspect-[1000/560] w-full" title={model.name} />
                  </motion.div>
                </AnimatePresence>
                <AnimatePresence>
                  <motion.span key={color} initial={{ opacity: 0.6, scale: 0.6 }} animate={{ opacity: 0, scale: 2.4 }} transition={{ duration: 0.9 }} className="pointer-events-none absolute h-40 w-40 rounded-full" style={{ background: `radial-gradient(circle, ${color}, transparent 70%)` }} />
                </AnimatePresence>
              </div>
            )}

            <dl className="grid grid-cols-3 gap-px overflow-hidden border-t border-ink/10 bg-ink/10 sm:grid-cols-5">
              {spec.map(({ I, v, u, l, live }, k) => (
                <div key={k} className={`bg-card/80 px-3 py-3 text-center backdrop-blur ${k > 2 ? "hidden sm:block" : ""}`}>
                  <dt className="flex items-center justify-center gap-1 text-[11px] text-ink/55">
                    <I size={13} />
                    {l}
                  </dt>
                  <dd className="latin-d mt-0.5 text-lg font-semibold md:text-xl">
                    {live ? <TweenNumber value={v} format={(n) => `${n}`} /> : v}
                    <span className="ms-1 text-xs font-normal text-ink/50">{u}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* ── options panel ── */}
        <aside className="min-w-0 px-5 pb-10 pt-8 lg:px-8 lg:pt-2">
          {fromQuote && <p className="mb-4 rounded-xl bg-ink/[0.05] px-3 py-2 text-xs text-ink/60">{fill(t.customize.loadedQuote, { id: fromQuote.slice(0, 6).toUpperCase() })}</p>}

          <h2 className="text-xs font-bold uppercase tracking-[0.25em] text-ink/50">{t.customize.switchModel}</h2>
          <div className="-mx-1 mt-3 flex snap-x gap-2 overflow-x-auto px-1 pb-3 [scrollbar-width:thin]" data-lenis-prevent>
            {models.map((m) => {
              const on = m.slug === model.slug;
              return (
                <Link
                  key={m.slug}
                  href={`/customize/${m.slug}?${configToQuery({ ...priced.config, color: undefined })}`}
                  scroll={false}
                  aria-current={on ? "true" : undefined}
                  className={`w-[132px] shrink-0 snap-start rounded-2xl border p-2 text-start transition-colors ${on ? "border-[var(--accent)] bg-[var(--accent)]/10" : "border-ink/10 hover:border-ink/30"}`}
                >
                  <ModelVisual model={m} color={colors[m.defaultColor] ?? "#ccc"} reflection={false} className="aspect-[1000/560] w-full" />
                  <span className="latin-d block truncate text-[12px] font-semibold">{m.name}</span>
                  <span className="flex items-center justify-between text-[10px] text-ink/55">
                    <span>{m.wheels === 2 ? t.common.wheel2 : t.common.wheel3}</span>
                    <span className="latin">{Math.round(m.basePrice / 1000)}k</span>
                  </span>
                </Link>
              );
            })}
          </div>

          {local.length > 0 && (
            <div className="mt-4 rounded-2xl border border-ink/10 p-3">
              <p className="text-xs font-semibold text-ink/60">{t.customize.savedOnDevice}</p>
              <ul className="mt-2 space-y-1.5">
                {local.slice(0, 4).map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{s.label}</span>
                    <button onClick={() => setConfig(s.config)} className="shrink-0 rounded-full border border-ink/20 px-3 py-1 text-xs hover:bg-ink hover:text-bg">
                      {t.customize.restore}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 space-y-9">
            {options.map((g) => (
              <OptionGroupView key={g.key} g={g} value={priced.config[g.key]} onPick={(id) => pick(g.key, id)} colors={colors} baseRange={model.specs.range} accent={meta.accent} photo={realThumb} />
            ))}
          </div>

          {/* bilingual-ready summary */}
          <div className="mt-10 rounded-3xl border border-ink/10 bg-card/60 p-5">
            <h3 className="font-display text-lg font-semibold">{t.customize.yourBuild}</h3>
            <ul className="mt-3 divide-y divide-ink/10 text-sm">
              <li className="flex justify-between gap-3 py-2">
                <span className="text-ink/70">
                  {t.customize.summaryBase} · <span className="latin">{model.name}</span>
                </span>
                <span className="font-semibold">{pkr(model.basePrice, lang)}</span>
              </li>
              {priced.lines.map((l) => (
                <li key={l.group} className="flex justify-between gap-3 py-2">
                  <span className="text-ink/70">
                    {tx(l.groupLabel)}: <span className="text-ink">{tx(l.label)}</span>
                  </span>
                  <span className={l.price ? "font-semibold" : "text-ink/45"}>{signedPkr(l.price, lang)}</span>
                </li>
              ))}
            </ul>
          </div>

          <AnimatePresence>
            {naming && (
              <motion.form
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
                onSubmit={(e) => {
                  e.preventDefault();
                  save();
                }}
              >
                <label className="mt-4 block text-sm font-semibold" htmlFor="setup-name">
                  {t.customize.saveName}
                </label>
                <div className="mt-2 flex gap-2">
                  <input ref={nameRef} id="setup-name" className="field" maxLength={60} value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t.customize.savePlaceholder} />
                  <button disabled={busy === "save"} className="shrink-0 rounded-[14px] bg-ink px-5 text-sm font-semibold text-bg disabled:opacity-50">
                    {t.common.save}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </aside>
      </div>

      <ProductDetails model={model} />

      {/* ── sticky price bar ── */}
      <div className="sticky bottom-0 z-40 mt-6 border-t border-ink/10 bg-card/85 backdrop-blur-2xl no-print">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-5 py-3 lg:px-8">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.2em] text-ink/50">
              {t.common.total} · <span className="normal-case tracking-normal">{t.customize.livePrice}</span>
            </p>
            <p className="font-display text-2xl font-semibold md:text-3xl">
              <TweenNumber value={priced.total} format={(n) => pkr(n, lang)} />
            </p>
            <p className="text-xs text-ink/50">
              {pkr(model.basePrice, lang)} + {pkr(priced.extras, lang)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={reset} className="inline-flex h-12 items-center gap-2 rounded-full border border-ink/20 px-4 text-sm font-semibold transition hover:bg-ink/10">
              <Refresh size={16} />
              <span className="hidden sm:inline">{t.customize.reset}</span>
            </button>
            <button onClick={() => setNaming((v) => !v)} aria-expanded={naming} className="inline-flex h-12 items-center gap-2 rounded-full border border-ink/20 px-4 text-sm font-semibold transition hover:bg-ink/10">
              <Bookmark size={16} />
              <span className="hidden sm:inline">{t.customize.save}</span>
            </button>
            <Button onClick={quote} disabled={busy === "quote"} magnetic={false}>
              {busy === "quote" ? t.customize.quoting : t.customize.quote}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function OptionGroupView({ g, value, onPick, colors, baseRange, accent, photo }: { g: OptionGroup; value?: string; onPick: (id: string) => void; colors: Record<string, string>; baseRange: number; accent: string; photo: string | null }) {
  const { t, tx, lang } = useI18n();
  const items = g.items.filter((i) => i.enabled);
  const sel = items.find((i) => i.id === value);
  const card = (on: boolean) => `relative rounded-2xl border text-start transition-all ${on ? "border-[var(--accent)] bg-[var(--accent)]/10 shadow-[0_0_0_1px_var(--accent)]" : "border-ink/12 hover:border-ink/35"}`;
  return (
    <fieldset>
      <legend className="flex w-full items-baseline justify-between gap-3">
        <span className="font-display text-lg font-semibold">{tx(g.label)}</span>
        {sel && <span className="text-xs text-ink/55">{tx(sel.label)}</span>}
      </legend>
      <p className="mt-0.5 text-[13px] text-ink/50">{tx(g.hint)}</p>
      <div role="radiogroup" aria-label={tx(g.label)} className="mt-3">
        {g.kind === "color" && (
          <div className="grid grid-cols-4 gap-3">
            {items.map((i) => {
              const on = i.id === value;
              const hex = i.hex ?? colors[i.id];
              const std = i.id === STD_COLOR && photo;
              return (
                <button key={i.id} role="radio" aria-checked={on} onClick={() => onPick(i.id)} className="group flex flex-col items-center gap-1.5 text-center">
                  <span
                    className={`relative grid h-12 w-12 place-items-center overflow-hidden rounded-full transition-transform group-hover:scale-110 ${on ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg)]" : "ring-1 ring-ink/20"}`}
                    style={std ? { backgroundColor: "#fff", backgroundImage: `url(${photo})`, backgroundSize: "175%", backgroundPosition: "40% 55%" } : { background: `radial-gradient(circle at 30% 28%, rgba(255,255,255,0.55), transparent 42%), ${hex}` }}
                  >
                    {on && <Check size={18} className={std ? "text-[var(--accent)] drop-shadow" : hex && parseInt(hex.slice(1), 16) > 0xb0b0b0 ? "text-black" : "text-white"} />}
                  </span>
                  <span className="text-[11px] leading-tight text-ink/75">{tx(i.label)}</span>
                  <span className="text-[10px] text-ink/45">{i.price ? `+${(i.price / 1000).toFixed(1).replace(/\.0$/, "")}k` : t.common.included}</span>
                </button>
              );
            })}
          </div>
        )}
        {g.kind === "wheel" && (
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5 lg:grid-cols-3">
            {items.map((i) => {
              const on = i.id === value;
              return (
                <button key={i.id} role="radio" aria-checked={on} onClick={() => onPick(i.id)} className={`${card(on)} group flex flex-col items-center p-2.5`}>
                  <span className="transition-transform duration-700 group-hover:rotate-[72deg]">
                    <WheelSwatch style={i.id} accent={accent} size={52} />
                  </span>
                  <span className="mt-1.5 text-center text-[11px] font-semibold leading-tight">{tx(i.label)}</span>
                  <span className="latin text-[10px] text-ink/50">{i.price ? `+${(i.price / 1000).toFixed(1).replace(/\.0$/, "")}k` : t.common.included}</span>
                </button>
              );
            })}
          </div>
        )}
        {(g.kind === "choice" || g.kind === "toggle") && (
          <div className={`grid gap-2.5 ${items.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
            {items.map((i) => {
              const on = i.id === value;
              return (
                <button key={i.id} role="radio" aria-checked={on} onClick={() => onPick(i.id)} className={`${card(on)} px-3.5 py-3`}>
                  {on && <Check size={14} className="absolute end-2.5 top-2.5 text-[var(--accent)]" />}
                  <span className="block pe-4 text-sm font-semibold">{tx(i.label)}</span>
                  {g.key === "battery" && i.rangeFactor && (
                    <span className="mt-0.5 block text-[11px] text-ink/55">
                      ≈ <span className="latin">{Math.round(baseRange * i.rangeFactor)}</span> {t.specs.km}
                    </span>
                  )}
                  <span className={`mt-1 block text-[11px] ${i.price ? "text-ink/70" : "text-ink/45"}`}>{signedPkr(i.price, lang)}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </fieldset>
  );
}
