"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import { CITIES } from "@/lib/catalog";
import { api, errorText } from "@/lib/client";
import type { CityKey, L, TestDriveStatus } from "@/lib/types";
import { Button, Notice } from "@/components/ui";
import { Check, Pin, Store } from "@/components/Icons";

export type TdStore = { id: string; name: L; city: CityKey; address: L; days: number[]; models: string[] };
export type TdMine = { id: string; model: string; store: string; date: string; time: string; status: TestDriveStatus };

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Pick a model, store, day and time; the free places come from the server for that exact day. */
export default function TestDriveForm({ models, stores, mine, signedIn, initialModel, minDate, maxDate }: { models: { slug: string; name: string }[]; stores: TdStore[]; mine: TdMine[]; signedIn: boolean; initialModel: string; minDate: string; maxDate: string }) {
  const { t, tx, lang } = useI18n();
  const router = useRouter();
  const [model, setModel] = useState(initialModel || models[0]?.slug || "");
  const [dealerId, setDealerId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [slots, setSlots] = useState<{ time: string; left: number }[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const offered = useMemo(() => stores.filter((s) => s.models.length === 0 || s.models.includes(model)), [stores, model]);
  const store = offered.find((s) => s.id === dealerId);
  const dates = useMemo(() => {
    if (!store) return [];
    const out: string[] = [];
    for (let d = new Date(`${minDate}T00:00:00Z`); iso(d) <= maxDate && out.length < 21; d = new Date(d.getTime() + 86400000)) if (store.days.includes(d.getUTCDay())) out.push(iso(d));
    return out;
  }, [store, minDate, maxDate]);

  useEffect(() => {
    if (!dealerId || !date || !model) return;
    let live = true;
    fetch(`/api/test-drive/slots?dealer=${encodeURIComponent(dealerId)}&model=${encodeURIComponent(model)}&date=${date}`)
      .then((r) => r.json())
      .then((j: { ok: boolean; slots?: { time: string; left: number }[] }) => live && setSlots(j.ok ? (j.slots ?? []) : []))
      .catch(() => live && setSlots([]));
    return () => {
      live = false;
    };
  }, [dealerId, date, model]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!dealerId || !date || !time) return setErr(t.errors.required);
    setBusy(true);
    const r = await api<{ id: string }>("/api/test-drive", { model, dealerId, date, time, note });
    setBusy(false);
    if (!r.ok) return setErr(errorText(t, r.error));
    setDone(r.id);
    router.refresh();
  }
  const fmt = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString(lang === "ur" ? "ur-PK" : "en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  const live = mine.filter((m) => m.status === "requested" || m.status === "confirmed");

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-5 pb-12 lg:grid-cols-[1fr_360px]">
      <form onSubmit={submit} className="glass space-y-6 rounded-3xl p-6 md:p-8">
        {done ? (
          <div className="py-8 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--volt)]/15 text-[var(--volt)]">
              <Check size={26} />
            </span>
            <h2 className="font-display mt-4 text-2xl font-semibold">{t.testDrive.requested}</h2>
            <p className="mx-auto mt-2 max-w-md text-ink/65">{t.testDrive.requestedText}</p>
            <p className="latin mt-2 font-mono text-sm text-ink/55">{done}</p>
            <p className="mt-3 text-sm text-ink/60">{t.testDrive.bring}</p>
            <Button type="button" magnetic={false} className="mt-6" onClick={() => (setDone(null), setDate(""), setTime(""), setSlots(null))}>
              {t.testDrive.cta}
            </Button>
          </div>
        ) : !signedIn ? (
          <div className="py-8 text-center">
            <p className="text-ink/70">{t.testDrive.loginNeeded}</p>
            <div className="mt-5 flex justify-center gap-3">
              <Link href="/login?next=/test-drive" className="inline-flex h-11 items-center rounded-md bg-[#111] px-6 text-sm font-semibold text-white">
                {t.nav.login}
              </Link>
              <Link href="/register?next=/test-drive" className="inline-flex h-11 items-center rounded-md border border-ink/20 px-6 text-sm font-semibold">
                {t.nav.register}
              </Link>
            </div>
          </div>
        ) : (
          <>
            <label className="block max-w-md">
              <span className="mb-1.5 block text-sm text-ink/70">{t.testDrive.model}</span>
              <select className="field" value={model} onChange={(e) => (setModel(e.target.value), setDealerId(""), setDate(""), setTime(""))}>
                {models.map((m) => (
                  <option key={m.slug} value={m.slug}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>

            <fieldset>
              <legend className="mb-2 text-sm text-ink/70">{t.testDrive.store}</legend>
              {offered.length === 0 && <Notice>{t.testDrive.noStores}</Notice>}
              <div role="radiogroup" className="grid gap-3 md:grid-cols-2">
                {offered.map((s) => (
                  <button type="button" role="radio" aria-checked={s.id === dealerId} key={s.id} onClick={() => (setDealerId(s.id), setDate(""), setTime(""), setSlots(null))} className={`rounded-2xl border p-4 text-start transition ${s.id === dealerId ? "border-[var(--accent)] bg-[var(--accent)]/10 shadow-[0_0_0_1px_var(--accent)]" : "border-ink/12 hover:border-ink/35"}`}>
                    <span className="flex items-center gap-2 font-semibold">
                      <Store size={16} className="text-[var(--accent)]" />
                      {tx(s.name)}
                    </span>
                    <span className="mt-2 flex gap-2 text-sm text-ink/60">
                      <Pin size={14} className="mt-1 shrink-0" />
                      {tx(s.address)} · {tx(CITIES[s.city])}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>

            {store && (
              <fieldset>
                <legend className="mb-2 text-sm text-ink/70">{t.testDrive.date}</legend>
                <div className="flex flex-wrap gap-2">
                  {dates.map((d) => (
                    <button type="button" key={d} aria-pressed={d === date} onClick={() => (setDate(d), setTime(""), setSlots(null))} className={`rounded-xl border px-3.5 py-2 text-sm transition ${d === date ? "border-[var(--accent)] bg-[var(--accent)]/10 font-semibold" : "border-ink/12 hover:border-ink/35"}`}>
                      {fmt(d)}
                    </button>
                  ))}
                  {dates.length === 0 && <p className="text-sm text-ink/55">{t.testDrive.noSlots}</p>}
                </div>
              </fieldset>
            )}

            {date && (
              <fieldset>
                <legend className="mb-2 text-sm text-ink/70">{t.testDrive.slots}</legend>
                {slots === null ? (
                  <p className="text-sm text-ink/50">…</p>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-ink/55">{t.testDrive.noSlots}</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {slots.map((s) => (
                      <button type="button" key={s.time} disabled={s.left <= 0} aria-pressed={s.time === time} onClick={() => setTime(s.time)} className={`latin rounded-xl border px-4 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${s.time === time ? "border-[var(--accent)] bg-[var(--accent)]/10 font-semibold" : "border-ink/12 hover:border-ink/35"}`}>
                        {s.time}
                        <span className="ms-2 text-[11px] text-ink/50">{s.left > 0 ? `${s.left} ${t.testDrive.left}` : t.testDrive.full}</span>
                      </button>
                    ))}
                  </div>
                )}
              </fieldset>
            )}

            <label className="block">
              <span className="mb-1.5 block text-sm text-ink/70">{t.testDrive.note}</span>
              <input className="field" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
            </label>
            {err && <Notice tone="error">{err}</Notice>}
            <p className="text-sm text-ink/55">{t.testDrive.bring}</p>
            <Button type="submit" disabled={busy || !time} magnetic={false}>
              {busy ? t.testDrive.working : t.testDrive.submit}
            </Button>
          </>
        )}
      </form>

      <aside className="glass h-fit rounded-3xl p-6">
        <h2 className="font-display text-xl font-semibold">{t.testDrive.mine}</h2>
        {!signedIn || mine.length === 0 ? (
          <p className="mt-3 text-sm text-ink/55">{t.testDrive.none}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {mine.map((m) => (
              <li key={m.id} className="rounded-2xl border border-ink/12 p-3 text-sm">
                <p className="flex items-center justify-between gap-2 font-semibold">
                  <span className="latin-d">{m.model}</span>
                  <span className="text-xs font-medium text-ink/60">{t.testDrive.status[m.status]}</span>
                </p>
                <p className="mt-1 text-ink/60">
                  {m.store} · <span className="latin">{fmt(m.date)}, {m.time}</span>
                </p>
                {live.some((x) => x.id === m.id) && (
                  <button
                    className="mt-2 text-xs font-semibold text-red-500 hover:underline"
                    onClick={async () => {
                      const r = await api(`/api/test-drive/${m.id}/cancel`, {});
                      if (r.ok) router.refresh();
                    }}
                  >
                    {t.testDrive.cancel}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
