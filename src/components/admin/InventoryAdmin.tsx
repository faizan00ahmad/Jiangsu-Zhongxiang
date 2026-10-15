"use client";
import { useState } from "react";
import { CITIES, CITY_ORDER, stockStatus } from "@/lib/catalog";
import { fill } from "@/lib/format";
import type { CityKey, Dealer, Model } from "@/lib/types";
import { useAdmin } from "./AdminProvider";
import { Btn, Card, Field, PageTitle, Pill, STOCK_COLOR, Toggle, inputCls } from "./ui";

type M = Pick<Model, "slug" | "name">;

export default function InventoryAdmin({ models, factory, dealers, low, canFactory }: { models: M[]; factory: Record<string, number>; dealers: Dealer[]; low: number; canFactory: boolean }) {
  const { t, lang, call } = useAdmin();
  const [fac, setFac] = useState(factory);
  const [adding, setAdding] = useState(false);
  const facDirty = JSON.stringify(fac) !== JSON.stringify(factory);
  const status = (q: number) => stockStatus(q, low);

  return (
    <>
      <PageTitle title={t.inventory.title} intro={t.inventory.intro} actions={canFactory && <Btn tone="primary" onClick={() => setAdding((v) => !v)}>+ {t.inventory.addDealer}</Btn>} />
      {adding && <AddDealer onDone={() => setAdding(false)} />}
      {!canFactory && <p className="mb-4 rounded-xl bg-ink/[0.05] px-4 py-2 text-sm text-ink/60">{t.inventory.onlyOwn}</p>}

      <Card
        title={t.inventory.factory}
        sub={fill(t.inventory.threshold, { n: low })}
        actions={
          canFactory && (
            <Btn tone="primary" disabled={!facDirty} onClick={() => call("/api/admin/inventory", { factory: fac }, "PUT")}>
              {t.common.save}
            </Btn>
          )
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {models.map((m) => {
            const q = fac[m.slug] ?? 0;
            const s = status(q);
            return (
              <div key={m.slug} className="rounded-xl border border-ink/10 p-3" style={{ borderColor: s === "in" ? undefined : `${STOCK_COLOR[s]}66` }}>
                <p className="truncate text-sm font-semibold">{m.name}</p>
                <div className="mt-2 flex items-center gap-2">
                  <input className={`${inputCls} w-24 tabular-nums`} type="number" min={0} value={q} disabled={!canFactory} onChange={(e) => setFac({ ...fac, [m.slug]: Math.max(0, Number(e.target.value)) })} aria-label={`${m.name} ${t.inventory.qty}`} />
                  <span className="text-xs text-ink/50">{t.common.units}</span>
                </div>
                <div className="mt-2">
                  <Pill color={STOCK_COLOR[s]}>{t.inventory.status[s]}</Pill>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <h2 className="mb-3 mt-8 font-semibold">{t.inventory.dealers}</h2>
      <div className="grid gap-5 xl:grid-cols-2">
        {dealers.map((d) => (
          <DealerCard key={d.id} d={d} models={models} canEdit={canFactory} low={low} lang={lang} />
        ))}
      </div>
    </>
  );
}

function DealerCard({ d, models, canEdit, low, lang }: { d: Dealer; models: M[]; canEdit: boolean; low: number; lang: "zh" | "en" }) {
  const { t, call } = useAdmin();
  const [s, setS] = useState(d.stock);
  const dirty = JSON.stringify(s) !== JSON.stringify(d.stock);
  const total = models.reduce((x, m) => x + (s[m.slug] ?? 0), 0);
  return (
    <Card
      title={d.name.en}
      sub={`${CITIES[d.city][lang]} · ${d.address.en} · ${d.phone}`}
      className={d.enabled ? "" : "opacity-60"}
      actions={
        <div className="flex items-center gap-3">
          {canEdit && <Toggle on={d.enabled} onChange={(v) => call("/api/admin/dealers", { id: d.id, enabled: v }, "PUT")} />}
          <Btn tone="primary" disabled={!dirty} onClick={() => call("/api/admin/inventory", { dealer: { id: d.id, stock: s } }, "PUT")}>
            {t.common.save}
          </Btn>
        </div>
      }
    >
      <p className="mb-3 text-xs text-ink/55">{fill(t.inventory.storeTotal, { n: total })}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {models.map((m) => {
          const q = s[m.slug] ?? 0;
          const st = stockStatus(q, Math.min(low, 1));
          return (
            <label key={m.slug} className="flex items-center justify-between gap-2 rounded-lg border border-ink/10 px-2.5 py-1.5 text-xs">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: STOCK_COLOR[st] }} />
                <span className="truncate">{m.name}</span>
              </span>
              <input className="w-14 rounded-md border border-ink/12 bg-field px-1.5 py-1 text-end tabular-nums" type="number" min={0} value={q} onChange={(e) => setS({ ...s, [m.slug]: Math.max(0, Number(e.target.value)) })} />
            </label>
          );
        })}
      </div>
    </Card>
  );
}

function AddDealer({ onDone }: { onDone: () => void }) {
  const { t, lang, call } = useAdmin();
  const [f, setF] = useState({ nameEn: "", nameUr: "", city: "karachi" as CityKey, addrEn: "", addrUr: "", phone: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <Card title={t.inventory.addDealer} className="mb-6">
      <form
        className="grid gap-4 md:grid-cols-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await call("/api/admin/dealers", { name: { en: f.nameEn, ur: f.nameUr }, address: { en: f.addrEn, ur: f.addrUr }, city: f.city, phone: f.phone })) onDone();
        }}
      >
        <Field label={`${t.inventory.dealerName} · ${t.common.en}`}>
          <input className={inputCls} value={f.nameEn} onChange={set("nameEn")} required />
        </Field>
        <Field label={`${t.inventory.dealerName} · ${t.common.ur}`}>
          <input className={inputCls} dir="rtl" value={f.nameUr} onChange={set("nameUr")} />
        </Field>
        <Field label={t.inventory.city}>
          <select className={inputCls} value={f.city} onChange={set("city")}>
            {CITY_ORDER.map((c) => (
              <option key={c} value={c}>
                {CITIES[c][lang]}
              </option>
            ))}
          </select>
        </Field>
        <Field label={`${t.inventory.address} · ${t.common.en}`}>
          <input className={inputCls} value={f.addrEn} onChange={set("addrEn")} required />
        </Field>
        <Field label={`${t.inventory.address} · ${t.common.ur}`}>
          <input className={inputCls} dir="rtl" value={f.addrUr} onChange={set("addrUr")} />
        </Field>
        <Field label={t.inventory.phone}>
          <input className={inputCls} value={f.phone} onChange={set("phone")} required />
        </Field>
        <div className="flex gap-2 md:col-span-3">
          <Btn tone="primary">{t.common.add}</Btn>
          <Btn type="button" tone="ghost" onClick={onDone}>
            {t.common.cancel}
          </Btn>
        </div>
      </form>
    </Card>
  );
}
