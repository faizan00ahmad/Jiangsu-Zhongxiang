"use client";
import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useI18n } from "@/i18n/I18nProvider";
import { api, errorText } from "@/lib/client";
import type { TrackingView } from "@/lib/server/views";
import { Button, Notice, ease } from "@/components/ui";
import { Search } from "@/components/Icons";
import Timeline, { StatusChip } from "./Timeline";

export default function TrackForm({ mine }: { mine: { id: string; modelName: string }[] }) {
  const { t } = useI18n();
  const [orderNo, setOrderNo] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [res, setRes] = useState<TrackingView | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const r = await api<{ order: TrackingView }>("/api/track", { orderNo, phone });
    setBusy(false);
    if (!r.ok) {
      setRes(null);
      return setErr(r.error === "not_found" ? t.tracking.notFound : errorText(t, r.error));
    }
    setRes(r.order);
  }

  return (
    <div className="mx-auto max-w-5xl px-5">
      <form onSubmit={submit} className="glass grid gap-4 rounded-3xl p-5 md:grid-cols-[1fr_1fr_auto] md:items-end md:p-7">
        <label className="block">
          <span className="mb-1.5 block text-sm text-ink/70">{t.tracking.orderNo}</span>
          <input className="field latin uppercase" dir="ltr" value={orderNo} onChange={(e) => setOrderNo(e.target.value)} placeholder={t.tracking.orderHint} required maxLength={20} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-ink/70">{t.tracking.phone}</span>
          <input className="field latin" dir="ltr" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03XX XXXXXXX" required maxLength={16} />
        </label>
        <Button type="submit" disabled={busy} magnetic={false} arrow={false}>
          <Search size={16} />
          {busy ? t.tracking.tracking : t.tracking.track}
        </Button>
      </form>
      {mine.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-ink/55">{t.tracking.mine}:</span>
          {mine.map((o) => (
            <Link key={o.id} href={`/orders/${o.id}`} className="latin rounded-full border border-ink/15 px-3 py-1 hover:bg-ink hover:text-bg">
              {o.id} · {o.modelName}
            </Link>
          ))}
        </div>
      )}
      {err && (
        <Notice tone="error" className="mt-6">
          {err}
        </Notice>
      )}
      <AnimatePresence mode="wait">
        {res && (
          <motion.section key={res.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.6, ease }} className="glass mt-8 rounded-3xl p-5 md:p-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="latin-d text-2xl font-semibold">{res.id}</p>
                <p className="latin text-ink/60">{res.modelName}</p>
              </div>
              <StatusChip status={res.status} />
            </div>
            <Timeline data={res} />
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
