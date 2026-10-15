"use client";
import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { KIND_META, KIND_ORDER } from "@/lib/catalog";
import { fill, n } from "@/lib/format";
import type { Model, OptionItem, VehicleKind } from "@/lib/types";
import ModelVisual from "@/components/vehicle/ModelVisual";
import { Chevron } from "@/components/Icons";
import { useAdmin } from "./AdminProvider";
import { Btn, Card, Field, PageTitle, Pill, Toggle, inputCls } from "./ui";

export default function ModelsAdmin({ models, colors }: { models: Model[]; colors: OptionItem[] }) {
  const { t, lang } = useAdmin();
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const hex = Object.fromEntries(colors.map((c) => [c.id, c.hex ?? "#888"]));
  return (
    <>
      <PageTitle title={t.models.title} intro={t.models.intro} actions={<Btn tone="primary" onClick={() => setAdding((v) => !v)}>+ {t.models.add}</Btn>} />
      <AnimatePresence>{adding && <AddModel onDone={() => setAdding(false)} />}</AnimatePresence>
      <p className="mb-3 text-sm text-ink/50">
        {fill(t.models.count, { n: models.length })} · {fill(t.models.listedCount, { n: models.filter((m) => m.enabled).length })}
      </p>
      <div className="space-y-3">
        {models.map((m) => {
          const isOpen = open === m.slug;
          const meta = KIND_META[m.kind];
          return (
            <div key={m.slug} className="overflow-hidden rounded-2xl border border-ink/10 bg-card/70">
              <button onClick={() => setOpen(isOpen ? null : m.slug)} className="flex w-full items-center gap-4 p-3 text-start hover:bg-ink/[0.03]" aria-expanded={isOpen}>
                <div className="w-32 shrink-0 rounded-xl bg-white px-1 pt-1">
                  <ModelVisual model={m} color={hex[m.defaultColor] ?? "#ccc"} reflection={false} className="aspect-[1000/560] w-full" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{m.name}</p>
                  <p className="text-xs text-ink/50">
                    {t.models.seriesNames[m.series]} · {lang === "zh" ? meta.zh : meta.label.en} · {m.slug}
                  </p>
                </div>
                <span className="hidden tabular-nums sm:block">PKR {n(m.basePrice)}</span>
                <Pill color={m.enabled ? "#2ee6a6" : "#8b93a3"}>{m.enabled ? t.models.listed : t.models.unlisted}</Pill>
                <Chevron className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                    <ModelEditor m={m} colors={colors} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </>
  );
}

function ModelEditor({ m, colors }: { m: Model; colors: OptionItem[] }) {
  const { t, call, toast, err } = useAdmin();
  const [f, setF] = useState(() => structuredClone(m));
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const dirty = JSON.stringify(f) !== JSON.stringify(m);
  const spec = (k: keyof Model["specs"]) => ({
    value: f.specs[k] ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, specs: { ...f.specs, [k]: e.target.value === "" ? undefined : Number(e.target.value) } }),
  });

  async function upload(fl: File) {
    setBusy(true);
    const fd = new FormData();
    fd.append("file", fl);
    const r = await fetch("/api/admin/upload", { method: "POST", body: fd })
      .then((x) => x.json())
      .catch(() => ({ ok: false, error: "network" }));
    setBusy(false);
    if (!r.ok) return toast(err(r.error), "error");
    setF((x) => ({ ...x, image: r.url }));
  }

  return (
    <div className="grid gap-6 border-t border-ink/10 p-5 lg:grid-cols-[1fr_340px]">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.models.name}>
          <input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={60} />
        </Field>
        <Field label={t.models.basePrice}>
          <input className={inputCls} type="number" min={1000} step={1000} value={f.basePrice} onChange={(e) => setF({ ...f, basePrice: Number(e.target.value) })} />
        </Field>
        <Field label={`${t.models.tagline} · ${t.common.en}`}>
          <input className={inputCls} value={f.tagline.en} onChange={(e) => setF({ ...f, tagline: { ...f.tagline, en: e.target.value } })} maxLength={140} />
        </Field>
        <Field label={`${t.models.tagline} · ${t.common.ur}`}>
          <input className={inputCls} dir="rtl" lang="ur" value={f.tagline.ur} onChange={(e) => setF({ ...f, tagline: { ...f.tagline, ur: e.target.value } })} maxLength={140} />
        </Field>
        <div className="sm:col-span-2">
          <p className="mb-2 text-xs font-semibold text-ink/60">{t.models.specs}</p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Field label={t.models.topSpeed}>
              <input className={inputCls} type="number" {...spec("topSpeed")} />
            </Field>
            <Field label={t.models.range}>
              <input className={inputCls} type="number" {...spec("range")} />
            </Field>
            <Field label={t.models.motor}>
              <input className={inputCls} type="number" {...spec("motor")} />
            </Field>
            <Field label={t.models.charge}>
              <input className={inputCls} type="number" step="0.5" {...spec("charge")} />
            </Field>
            <Field label={t.models.seats}>
              <input className={inputCls} type="number" {...spec("seats")} />
            </Field>
            <Field label={t.models.payload}>
              <input className={inputCls} type="number" {...spec("payload")} />
            </Field>
            <Field label={t.models.weight}>
              <input className={inputCls} type="number" {...spec("weight")} />
            </Field>
            <Field label={t.models.sort}>
              <input className={inputCls} type="number" value={f.sort} onChange={(e) => setF({ ...f, sort: Number(e.target.value) })} />
            </Field>
          </div>
        </div>
        <Field label={t.models.defaultColor}>
          <select className={inputCls} value={f.defaultColor} onChange={(e) => setF({ ...f, defaultColor: e.target.value })}>
            {colors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label.en}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t.models.variant}>
          <select className={inputCls} value={f.variant} onChange={(e) => setF({ ...f, variant: Number(e.target.value) })}>
            {[0, 1, 2].map((v) => (
              <option key={v} value={v}>
                {v + 1}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex items-center gap-4 sm:col-span-2">
          <Toggle on={f.enabled} onChange={(v) => setF({ ...f, enabled: v })} label={f.enabled ? t.models.listed : t.models.unlisted} />
        </div>
        {f.specsEstimated && <p className="rounded-lg bg-[var(--amber)]/15 px-3 py-2 text-xs text-[var(--amber)] sm:col-span-2">{t.models.estimated}</p>}

        {f.colors.length > 0 && (
          <div className="sm:col-span-2">
            <p className="text-xs font-semibold text-ink/60">{t.models.paints}</p>
            <p className="mb-2 text-[11px] text-ink/40">{t.models.paintsHint}</p>
            <div className="space-y-2">
              {f.colors.map((c, i) => {
                const upd = (patch: Partial<typeof c>) => setF({ ...f, colors: f.colors.map((x, k) => (k === i ? { ...x, ...patch } : x)) });
                return (
                  <div key={c.id} className="grid grid-cols-[72px_1fr_1fr_110px_auto] items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {c.image ? <img src={c.image} alt="" className="h-11 w-full rounded-md object-cover" /> : <span className="h-11 rounded-md" style={{ background: c.hex }} />}
                    <input className={inputCls} value={c.label.en} onChange={(e) => upd({ label: { ...c.label, en: e.target.value } })} aria-label={`${t.common.en} ${i + 1}`} />
                    <input className={inputCls} dir="rtl" value={c.label.ur} onChange={(e) => upd({ label: { ...c.label, ur: e.target.value } })} aria-label={`${t.common.ur} ${i + 1}`} />
                    <input className={`${inputCls} tabular-nums`} type="number" min={0} step={500} value={c.price} onChange={(e) => upd({ price: Number(e.target.value) })} aria-label={t.options.price} />
                    <Toggle on={c.enabled} onChange={(v) => upd({ enabled: v })} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {f.photos.gallery.length > 0 && (
          <div className="sm:col-span-2">
            <p className="mb-2 text-xs font-semibold text-ink/60">{t.models.gallery}</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {f.photos.gallery.map((g) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={g} src={g} alt="" className="h-16 w-24 shrink-0 rounded-md object-cover" />
              ))}
            </div>
          </div>
        )}
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-ink/60">{t.models.image}</p>
        <div className="overflow-hidden rounded-xl border border-ink/10 bg-white p-2">
          <ModelVisual model={f} color={colors.find((c) => c.id === f.defaultColor)?.hex ?? "#ccc"} reflection={false} className="aspect-[1000/560] w-full" />
        </div>
        <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        <div className="mt-3 flex gap-2">
          <Btn onClick={() => file.current?.click()} disabled={busy}>
            {busy ? t.models.uploading : t.models.upload}
          </Btn>
          {f.image && (
            <Btn tone="ghost" onClick={() => setF({ ...f, image: null })}>
              {t.models.removeImage}
            </Btn>
          )}
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-ink/45">{t.models.uploadHint}</p>
        <div className="mt-6 flex items-center justify-end gap-3">
          {dirty && <span className="text-xs text-[var(--amber)]">{t.common.unsaved}</span>}
          <Btn tone="ghost" onClick={() => setF(structuredClone(m))} disabled={!dirty}>
            {t.common.cancel}
          </Btn>
          <Btn
            tone="primary"
            disabled={!dirty}
            onClick={() => call("/api/admin/models", { slug: m.slug, patch: { name: f.name, basePrice: f.basePrice, tagline: f.tagline, specs: { ...f.specs, seats: f.specs.seats ?? "", payload: f.specs.payload ?? "" }, defaultColor: f.defaultColor, variant: f.variant, sort: f.sort, enabled: f.enabled, image: f.image, colors: f.colors } }, "PUT")}
          >
            {t.common.save}
          </Btn>
        </div>
      </div>
    </div>
  );
}

function AddModel({ onDone }: { onDone: () => void }) {
  const { t, lang, call } = useAdmin();
  const [f, setF] = useState({ slug: "", name: "", kind: "commuter" as VehicleKind, basePrice: 200000 });
  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mb-5">
      <Card title={t.models.add}>
        <form
          className="grid gap-4 md:grid-cols-5 md:items-end"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await call("/api/admin/models", f)) onDone();
          }}
        >
          <Field label={t.models.slug} hint={t.models.slugHint}>
            <input className={inputCls} value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} required pattern="[a-z0-9]+(-[a-z0-9]+)*" />
          </Field>
          <Field label={t.models.name}>
            <input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
          </Field>
          <Field label={t.models.kind}>
            <select className={inputCls} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as VehicleKind })}>
              {KIND_ORDER.map((k) => (
                <option key={k} value={k}>
                  {lang === "zh" ? KIND_META[k].zh : KIND_META[k].label.en}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t.models.basePrice}>
            <input className={inputCls} type="number" value={f.basePrice} onChange={(e) => setF({ ...f, basePrice: Number(e.target.value) })} />
          </Field>
          <div className="flex gap-2 md:pb-5">
            <Btn tone="primary">{t.common.add}</Btn>
            <Btn type="button" tone="ghost" onClick={onDone}>
              {t.common.cancel}
            </Btn>
          </div>
        </form>
      </Card>
    </motion.div>
  );
}
