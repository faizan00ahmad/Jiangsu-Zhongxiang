"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import { CITIES } from "@/lib/catalog";
import { api, errorText } from "@/lib/client";
import type { CityKey, L } from "@/lib/types";
import { Button, Notice } from "@/components/ui";
import { Check, Phone, Pin, Store } from "@/components/Icons";

export type PickupStore = { id: string; name: L; address: L; city: CityKey; phone: string; status: "in" | "low" | "incoming" };

/** "Choose your pickup store", shown on the order page after ordering. Stock for this model is shown per store. */
export default function PickupPanel({ orderId, stores, currentId, myCity, locked }: { orderId: string; stores: PickupStore[]; currentId: string | null; myCity: CityKey; locked: boolean }) {
  const { t, tx } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(!currentId && !locked);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const cur = stores.find((s) => s.id === currentId);
  const mine = stores.filter((s) => s.city === myCity);
  const others = stores.filter((s) => s.city !== myCity);
  const STATUS: Record<PickupStore["status"], [string, string]> = { in: [t.pickup.inStock, "#16b364"], low: [t.pickup.low, "#f59e0b"], incoming: [t.pickup.incoming, "#3d8bff"] };

  async function choose(id: string) {
    setBusy(id);
    setMsg(null);
    const r = await api(`/api/orders/${orderId}/pickup`, { dealerId: id });
    setBusy("");
    if (!r.ok) return setMsg({ tone: "error", text: errorText(t, r.error) });
    setMsg({ tone: "ok", text: t.pickup.saved });
    setOpen(false);
    router.refresh();
  }
  const card = (s: PickupStore) => {
    const on = s.id === currentId;
    return (
      <li key={s.id} className={`rounded-2xl border p-4 ${on ? "border-[var(--accent)] bg-[var(--accent)]/10" : "border-ink/12"}`}>
        <div className="flex items-start justify-between gap-3">
          <p className="flex items-center gap-2 font-semibold">
            <Store size={16} className="text-[var(--accent)]" />
            {tx(s.name)}
          </p>
          <span className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ background: `${STATUS[s.status][1]}22`, color: STATUS[s.status][1] }}>
            {STATUS[s.status][0]}
          </span>
        </div>
        <p className="mt-2 flex gap-2 text-sm text-ink/60">
          <Pin size={14} className="mt-1 shrink-0" />
          {tx(s.address)} · {tx(CITIES[s.city])}
        </p>
        <p className="latin mt-1 flex items-center gap-2 text-sm text-ink/60">
          <Phone size={14} />
          <span dir="ltr">{s.phone}</span>
        </p>
        {on ? (
          <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-[var(--accent)]">
            <Check size={15} /> {t.pickup.selected}
          </p>
        ) : (
          <Button type="button" magnetic={false} disabled={!!busy} onClick={() => choose(s.id)} className="mt-3 w-full">
            {t.pickup.select}
          </Button>
        )}
      </li>
    );
  };

  return (
    <section className={`glass rounded-3xl p-5 md:p-8 ${!currentId && !locked ? "ring-2 ring-[var(--accent)]/50" : ""}`}>
      <h2 className="font-display text-2xl font-semibold">{t.pickup.title}</h2>
      {locked ? (
        <Notice className="mt-4">{t.pickup.locked}</Notice>
      ) : (
        <p className="mt-2 text-sm text-ink/60">{currentId ? t.pickup.intro : t.pickup.reminder}</p>
      )}
      {cur && !open && (
        <ul className="mt-5">{card(cur)}</ul>
      )}
      {!cur && !open && !locked && <p className="mt-4 text-sm text-ink/55">{t.pickup.none}</p>}
      {!locked && !open && (
        <Button type="button" magnetic={false} onClick={() => setOpen(true)} className="mt-5">
          {cur ? t.pickup.change : t.pickup.choose}
        </Button>
      )}
      {open && !locked && (
        <div className="mt-5 space-y-6">
          {mine.length > 0 && (
            <div>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-ink/50">{t.pickup.yourCity}</h3>
              <ul className="grid gap-3 md:grid-cols-2">{mine.map(card)}</ul>
            </div>
          )}
          {others.length > 0 && (
            <div>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-ink/50">{t.pickup.otherCities}</h3>
              <ul className="grid gap-3 md:grid-cols-2">{others.map(card)}</ul>
            </div>
          )}
        </div>
      )}
      {msg && (
        <Notice tone={msg.tone} className="mt-4">
          {msg.text}
        </Notice>
      )}
    </section>
  );
}
