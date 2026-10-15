"use client";
import { useRef, useState } from "react";
import { SITE_DICT } from "@/i18n/site";
import { useI18n, useToast } from "@/i18n/I18nProvider";
import { KIND_META } from "@/lib/catalog";
import { date, fill, pkr } from "@/lib/format";
import { depositFor } from "@/lib/pricing";
import type { Model, Quote } from "@/lib/types";
import { errorText } from "@/lib/client";
import Logo from "@/components/Logo";
import ModelVisual, { type VisualModel } from "@/components/vehicle/ModelVisual";
import { Button, Reveal } from "@/components/ui";
import { Download, Printer, Share, Sliders } from "@/components/Icons";

const EN = SITE_DICT.en;
const UR = SITE_DICT.ur;

/** Bilingual quotation sheet (English + Urdu on every line), always on white "paper" so it saves, prints and shares cleanly. */
export default function QuoteView({ quote, model, color, depositPercent, preparedFor }: { quote: Quote; model: VisualModel & Pick<Model, "slug">; color: string; depositPercent: number; preparedFor: string | null }) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const sheet = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const no = quote.id.slice(0, 8).toUpperCase();
  const extras = quote.total - quote.basePrice;
  const deposit = depositFor(quote.total, depositPercent);
  const file = `ZX-Quotation-${no}.png`;

  async function toImage() {
    const { toPng } = await import("html-to-image");
    return toPng(sheet.current!, { pixelRatio: 2, backgroundColor: "#ffffff", cacheBust: true });
  }
  async function download() {
    setBusy(true);
    try {
      const url = await toImage();
      const a = document.createElement("a");
      a.href = url;
      a.download = file;
      a.click();
    } catch {
      toast(errorText(t, "image_failed"), "error");
    }
    setBusy(false);
  }
  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        try {
          const blob = await (await fetch(await toImage())).blob();
          const f = new File([blob], file, { type: "image/png" });
          if (navigator.canShare?.({ files: [f] })) return await navigator.share({ files: [f], title: t.quote.shareText, url });
        } catch {}
        return await navigator.share({ title: t.quote.shareText, url });
      }
      await navigator.clipboard.writeText(url);
      toast(t.errors.share_unsupported, "info");
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") {
        await navigator.clipboard?.writeText(url).catch(() => {});
        toast(t.common.copied, "ok");
      }
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-10 pt-32 md:pt-36">
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold md:text-4xl">{t.quote.title}</h1>
        <div className="flex flex-wrap gap-2">
          <button onClick={download} disabled={busy} className="inline-flex h-11 items-center gap-2 rounded-full border border-ink/20 px-4 text-sm font-semibold hover:bg-ink/10 disabled:opacity-50">
            <Download size={16} /> {t.quote.download}
          </button>
          <button onClick={() => window.print()} className="inline-flex h-11 items-center gap-2 rounded-full border border-ink/20 px-4 text-sm font-semibold hover:bg-ink/10">
            <Printer size={16} /> {t.quote.print}
          </button>
          <button onClick={share} className="inline-flex h-11 items-center gap-2 rounded-full border border-ink/20 px-4 text-sm font-semibold hover:bg-ink/10">
            <Share size={16} /> {t.quote.share}
          </button>
        </div>
      </div>

      <Reveal y={30}>
        <div ref={sheet} dir="ltr" className="print-sheet overflow-hidden rounded-[1.75rem] bg-white text-[#0b0f16] shadow-[0_40px_120px_-40px_rgba(0,0,0,0.8)]" data-theme="light" style={{ ["--ink" as string]: "#0b0f16" }}>
          <div className="flex flex-wrap items-start justify-between gap-6 border-b border-black/10 p-6 md:p-10">
            <Logo size="lg" />
            <div className="text-end text-sm">
              <p className="font-display text-2xl font-semibold">
                {EN.quote.title} <span className="font-[family-name:var(--font-urdu)] text-xl text-[#5a6373]">· {UR.quote.title}</span>
              </p>
              <p className="mt-1 text-[#5a6373]">
                {EN.common.quoteNo} <b className="text-[#0b0f16]">{no}</b>
              </p>
              <p className="text-[#5a6373]">
                {EN.quote.issued} {date(quote.createdAt)}
              </p>
              {preparedFor && (
                <p className="text-[#5a6373]">
                  {EN.quote.preparedFor} <b className="text-[#0b0f16]">{preparedFor}</b>
                </p>
              )}
            </div>
          </div>

          <div className="grid items-center gap-6 bg-gradient-to-b from-[#f3f5f8] to-white p-6 md:grid-cols-[1.3fr_1fr] md:p-10">
            <ModelVisual model={model} color={color} colorId={quote.config.color} wheel={quote.config.wheel} reflection={false} className="aspect-[1000/560] w-full rounded-xl" />
            <div>
              <Bi en={KIND_META[model.kind].label.en} ur={KIND_META[model.kind].label.ur} className="text-xs font-bold uppercase tracking-[0.2em] text-[#0c8f64]" />
              <p className="font-display mt-1 text-3xl font-semibold">{quote.modelName}</p>
              <p className="mt-3 text-sm text-[#5a6373]">
                {EN.quote.rangeLine}: <b className="text-[#0b0f16]">{quote.range} km</b>
              </p>
              <p className="font-display mt-4 text-4xl font-bold">{pkr(quote.total)}</p>
              <p dir="rtl" className="font-[family-name:var(--font-urdu)] text-lg text-[#5a6373]">
                {pkr(quote.total, "ur")}
              </p>
            </div>
          </div>

          <div className="px-6 pb-6 md:px-10">
            <h2 className="mb-3 mt-2 flex items-baseline gap-2 font-semibold">
              {EN.quote.subtitle} <span className="font-[family-name:var(--font-urdu)] text-sm font-normal text-[#5a6373]">· {UR.quote.subtitle}</span>
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-black/10 text-start text-xs uppercase tracking-wider text-[#5a6373]">
                  <th className="py-2 text-start font-semibold">{EN.quote.item}</th>
                  <th className="py-2 text-start font-semibold">{EN.quote.selection}</th>
                  <th className="py-2 text-end font-semibold">{EN.quote.price}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-black/5 align-top">
                  <td className="py-2.5 pe-3">
                    <Bi en={EN.quote.base} ur={UR.quote.base} />
                  </td>
                  <td className="py-2.5 pe-3 font-semibold">{quote.modelName}</td>
                  <td className="py-2.5 text-end font-semibold">{pkr(quote.basePrice)}</td>
                </tr>
                {quote.lines.map((l) => (
                  <tr key={l.group} className="border-b border-black/5 align-top">
                    <td className="py-2.5 pe-3">
                      <Bi en={l.groupLabel.en} ur={l.groupLabel.ur} />
                    </td>
                    <td className="py-2.5 pe-3">
                      <Bi en={l.label.en} ur={l.label.ur} />
                    </td>
                    <td className={`py-2.5 text-end ${l.price ? "font-semibold" : "text-[#8b93a3]"}`}>{l.price ? `+ ${pkr(l.price)}` : EN.common.included}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="ms-auto mt-5 max-w-sm space-y-1.5 text-sm">
              <Row en={EN.quote.base} ur={UR.quote.base} v={pkr(quote.basePrice)} />

              <Row en={EN.quote.extras} ur={UR.quote.extras} v={pkr(extras)} />

              <div className="my-2 border-t border-black/15" />
              <Row en={EN.quote.total} ur={UR.quote.total} v={pkr(quote.total)} strong />
              <Row en={fill(EN.quote.depositLine, { p: depositPercent })} ur={fill(UR.quote.depositLine, { p: depositPercent })} v={pkr(deposit)} />

            </div>
          </div>

          <div className="border-t border-black/10 bg-[#f6f7f9] px-6 py-4 text-xs text-[#5a6373] md:px-10">
            <Bi en={`${EN.quote.formula}. ${EN.common.pkrNote}`} ur={`${UR.quote.formula}۔ ${UR.common.pkrNote}`} />
          </div>
        </div>
      </Reveal>

      <div className="no-print mt-8 flex flex-wrap justify-center gap-3">
        <Button href={`/customize/${model.slug}?q=${quote.id}`} variant="ghost" arrow={false}>
          <Sliders size={16} /> {t.quote.modify}
        </Button>
        <Button href={`/checkout/${quote.id}`}>{t.quote.order}</Button>
      </div>
      <p className="no-print mt-4 text-center text-xs text-ink/50">{lang === "ur" ? UR.quote.formula : EN.quote.formula}</p>
    </div>
  );
}

/** English line with its Urdu twin underneath. */
function Bi({ en, ur, className = "" }: { en: string; ur: string; className?: string }) {
  return (
    <span className={`flex flex-col ${className}`}>
      <span>{en}</span>
      <span dir="rtl" lang="ur" className="font-[family-name:var(--font-urdu)] text-[0.82em] leading-[1.9] text-[#5a6373]">
        {ur}
      </span>
    </span>
  );
}

function Row({ en, ur, v, strong = false }: { en: string; ur: string; v: string; strong?: boolean }) {
  return (
    <div className={`flex items-start justify-between gap-4 ${strong ? "text-base font-bold" : ""}`}>
      <Bi en={en} ur={ur} />
      <span className="shrink-0">{v}</span>
    </div>
  );
}
