"use client";
import { useState } from "react";
import type { Field, Opt } from "@/lib/admin/resources";
import type { L, Seo } from "@/lib/types";
import { Markdown } from "@/lib/markdown";
import { useAdmin } from "../AdminProvider";
import { Btn, Toggle, inputCls } from "../ui";

const pad = (n: number) => String(n).padStart(2, "0");
const toLocal = (iso: unknown) => {
  if (typeof iso !== "string" || !iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function ImageInput({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const { k, toast, err } = useAdmin();
  const [busy, setBusy] = useState(false);
  const pick = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    const body = new FormData();
    body.set("file", f);
    try {
      const r = await fetch("/api/admin/upload", { method: "POST", body });
      const j = (await r.json()) as { ok: boolean; url?: string; error?: string };
      if (j.ok && j.url) onChange(j.url);
      else toast(err(j.error ?? "server"), "error");
    } catch {
      toast(err("network"), "error");
    }
    setBusy(false);
  };
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-16 w-28 shrink-0 place-items-center overflow-hidden rounded-lg border border-dashed border-ink/20 bg-ink/[0.04]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : <span className="text-xs text-ink/40">{k.form.none}</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        <label className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-ink/15 bg-ink/[0.04] px-3.5 text-sm hover:bg-ink/10">
          {busy ? k.form.uploading : k.form.upload}
          <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={busy} onChange={(e) => (pick(e.target.files?.[0]), (e.target.value = ""))} />
        </label>
        {value && (
          <Btn tone="ghost" onClick={() => onChange(null)}>
            {k.form.remove}
          </Btn>
        )}
      </div>
    </div>
  );
}

export function LangInput({ value, onChange, area = false, maxLen }: { value: L | undefined; onChange: (v: L) => void; area?: boolean; maxLen?: number }) {
  const { k } = useAdmin();
  const v = value ?? { en: "", ur: "" };
  const El = area ? "textarea" : "input";
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <label className="block">
        <span className="mb-0.5 block text-[11px] text-ink/45">{k.form.english}</span>
        <El className={`${inputCls} latin ${area ? "min-h-[84px]" : ""}`} maxLength={maxLen} value={v.en} onChange={(e) => onChange({ ...v, en: e.target.value })} dir="ltr" />
      </label>
      <label className="block">
        <span className="mb-0.5 block text-[11px] text-ink/45">{k.form.urdu}</span>
        <El className={`${inputCls} ${area ? "min-h-[84px]" : ""}`} maxLength={maxLen} value={v.ur} onChange={(e) => onChange({ ...v, ur: e.target.value })} dir="rtl" lang="ur" />
      </label>
    </div>
  );
}

export function MarkdownInput({ value, onChange }: { value: L | undefined; onChange: (v: L) => void }) {
  const { k } = useAdmin();
  const [lang, setLang] = useState<"en" | "ur">("en");
  const [view, setView] = useState(false);
  const v = value ?? { en: "", ur: "" };
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        {(["en", "ur"] as const).map((l) => (
          <button key={l} type="button" onClick={() => setLang(l)} className={`rounded-md px-2.5 py-1 ${lang === l ? "bg-ink text-bg" : "bg-ink/[0.07] text-ink/70"}`}>
            {l === "en" ? k.form.english : k.form.urdu}
          </button>
        ))}
        <button type="button" onClick={() => setView((x) => !x)} className="ms-auto rounded-md border border-ink/15 px-2.5 py-1">
          {view ? k.form.write : k.form.preview}
        </button>
      </div>
      {view ? (
        <div className="min-h-[200px] rounded-lg border border-ink/12 bg-field p-4 text-sm" dir={lang === "ur" ? "rtl" : "ltr"}>
          <Markdown text={v[lang]} />
        </div>
      ) : (
        <textarea className={`${inputCls} min-h-[220px] font-mono text-[13px]`} value={v[lang]} onChange={(e) => onChange({ ...v, [lang]: e.target.value })} dir={lang === "ur" ? "rtl" : "ltr"} spellCheck />
      )}
      <p className="mt-1 text-[11px] text-ink/40"># ## ### · **bold** · *italic* · - list · [text](/link)</p>
    </div>
  );
}

export function MultiPick({ value, options, onChange }: { value: string[]; options: Opt[]; onChange: (v: string[]) => void }) {
  const { lang } = useAdmin();
  return (
    <div className="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto" data-lenis-prevent>
      {options.map((o) => {
        const on = value.includes(o.value);
        return (
          <button key={o.value} type="button" aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== o.value) : [...value, o.value])} className={`rounded-full border px-3 py-1 text-xs transition ${on ? "border-[var(--volt)] bg-[var(--volt)]/15 text-ink" : "border-ink/15 text-ink/60 hover:bg-ink/10"}`}>
            {o.label[lang]}
          </button>
        );
      })}
    </div>
  );
}

export function SeoInput({ value, onChange }: { value: Seo | null | undefined; onChange: (v: Seo) => void }) {
  const { k } = useAdmin();
  const v: Seo = value ?? { title: { en: "", ur: "" }, description: { en: "", ur: "" }, image: null, noindex: false };
  return (
    <div className="space-y-3 rounded-xl border border-ink/10 bg-ink/[0.025] p-3">
      <div>
        <p className="mb-1 text-xs font-medium text-ink/60">{k.form.seoTitle}</p>
        <LangInput value={v.title} onChange={(x) => onChange({ ...v, title: x })} maxLen={120} />
      </div>
      <div>
        <p className="mb-1 text-xs font-medium text-ink/60">{k.form.seoDesc}</p>
        <LangInput value={v.description} onChange={(x) => onChange({ ...v, description: x })} area maxLen={300} />
      </div>
      <div>
        <p className="mb-1 text-xs font-medium text-ink/60">{k.form.seoImage}</p>
        <ImageInput value={v.image} onChange={(x) => onChange({ ...v, image: x })} />
      </div>
      <Toggle on={v.noindex} onChange={(x) => onChange({ ...v, noindex: x })} label={k.form.noindex} />
    </div>
  );
}

/** One control for any schema field. `lookups` supplies options that come from other collections. */
export function FieldInput({ f, value, onChange, lookups }: { f: Field; value: unknown; onChange: (v: unknown) => void; lookups: Record<string, Opt[]> }) {
  const { lang, k } = useAdmin();
  const opts: Opt[] = typeof f.options === "string" ? (lookups[f.options] ?? []) : (f.options ?? []);
  const dis = f.readOnly;
  switch (f.type) {
    case "text":
    case "slug":
      return <input className={`${inputCls} ${f.type === "slug" ? "latin" : ""}`} value={String(value ?? "")} maxLength={f.maxLen} disabled={dis} onChange={(e) => onChange(e.target.value)} dir="auto" />;
    case "textarea":
      return <textarea className={`${inputCls} min-h-[96px]`} value={String(value ?? "")} maxLength={f.maxLen} disabled={dis} onChange={(e) => onChange(e.target.value)} dir="auto" />;
    case "number":
      return <input type="number" className={`${inputCls} latin`} value={value === undefined || value === null ? "" : Number(value)} min={f.min} max={f.max} step="any" disabled={dis} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} />;
    case "bool":
      return <Toggle on={value === true} onChange={onChange} label={value === true ? k.status.on : k.status.off} />;
    case "select":
      return (
        <select className={inputCls} value={String(value ?? "")} disabled={dis} onChange={(e) => onChange(e.target.value)}>
          {!f.required && <option value="">{k.form.none}</option>}
          {opts.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label[lang]}
            </option>
          ))}
        </select>
      );
    case "multiselect":
      return <MultiPick value={Array.isArray(value) ? (value as string[]) : []} options={opts} onChange={onChange} />;
    case "lang":
      return <LangInput value={value as L | undefined} onChange={onChange} maxLen={f.maxLen} />;
    case "langarea":
      return <LangInput value={value as L | undefined} onChange={onChange} area maxLen={f.maxLen} />;
    case "markdown":
      return <MarkdownInput value={value as L | undefined} onChange={onChange} />;
    case "image":
      return <ImageInput value={(value as string | null) ?? null} onChange={onChange} />;
    case "datetime":
      return <input type="datetime-local" className={`${inputCls} latin`} value={toLocal(value)} disabled={dis} onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : "")} />;
    case "color":
      return <input type="color" className="h-9 w-16 rounded-lg border border-ink/12 bg-field" value={String(value ?? "#000000")} onChange={(e) => onChange(e.target.value)} />;
    case "rgb": {
      const rgb = String(value ?? "255,255,255");
      return (
        <div className="flex items-center gap-2">
          <span className="h-9 w-9 shrink-0 rounded-lg border border-ink/15" style={{ background: `rgb(${rgb})` }} />
          <input className={`${inputCls} latin`} value={rgb} onChange={(e) => onChange(e.target.value)} placeholder="255,59,59" />
        </div>
      );
    }
    case "tags":
      return <input className={inputCls} value={Array.isArray(value) ? (value as string[]).join(", ") : String(value ?? "")} onChange={(e) => onChange(e.target.value)} placeholder="tag, tag" />;
    case "seo":
      return <SeoInput value={value as Seo | null} onChange={onChange} />;
  }
}
