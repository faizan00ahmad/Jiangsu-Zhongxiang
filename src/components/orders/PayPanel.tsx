"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n, useToast } from "@/i18n/I18nProvider";
import { dateTime, fill, pkr } from "@/lib/format";
import { api, errorText } from "@/lib/client";
import type { PayMethod, PayMode } from "@/lib/types";
import { Lock } from "@/components/Icons";
import { Notice } from "@/components/ui";
import MethodPicker from "@/components/pay/MethodPicker";

export type PayInfo = { methods: PayMethod[]; advance: number; full: number; groupId: string | null; count: number; reviewId: string | null };

/** Shown while an order waits for its payment: choose how much and how, then go to the payment page. Also lets the customer cancel before paying. */
export default function PayPanel({ orderId, lockExpiresAt, pay }: { orderId: string; lockExpiresAt: string; pay: PayInfo }) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [method, setMethod] = useState<PayMethod | "">(pay.methods[0] ?? "");
  const [mode, setMode] = useState<PayMode>("advance");
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [err, setErr] = useState("");

  async function start() {
    if (!method) return;
    setBusy(true);
    setErr("");
    const r = await api<{ id: string }>("/api/pay/start", pay.groupId ? { groupId: pay.groupId, method, mode } : { orderId, method, mode });
    if (!r.ok) {
      setBusy(false);
      return setErr(errorText(t, r.error));
    }
    router.push(`/pay/${r.id}`);
  }
  async function cancel() {
    if (!confirmCancel) return setConfirmCancel(true);
    setBusy(true);
    const r = await api(`/api/orders/${orderId}/cancel`, {});
    setBusy(false);
    if (!r.ok) return setErr(errorText(t, r.error));
    toast(t.order.cancelled, "info");
    router.refresh();
  }

  if (pay.reviewId) {
    return (
      <section className="rounded-3xl border border-[#3d8bff]/40 bg-[#3d8bff]/[0.06] p-6 md:p-8">
        <h2 className="font-display text-2xl font-semibold">{t.pay.result.reviewTitle}</h2>
        <p className="mt-2 text-ink/70">{t.pay.inReview}</p>
        <Link href={`/pay/${pay.reviewId}`} className="mt-4 inline-flex h-11 items-center rounded-full border border-ink/20 px-5 text-sm font-semibold hover:bg-ink/10">
          {t.pay.result.reviewTitle}
        </Link>
      </section>
    );
  }

  const due = mode === "full" ? pay.full : pay.advance;
  return (
    <section className="relative overflow-hidden rounded-3xl border border-[var(--amber)]/40 bg-[var(--amber)]/[0.06] p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <h2 className="font-display flex items-center gap-2 text-2xl font-semibold">
            <Lock size={22} className="text-[var(--amber)]" />
            {t.order.payTitle}
          </h2>
          <p className="mt-2 text-ink/70">{fill(t.order.payText, { amount: pkr(pay.advance, lang) })}</p>
          <p className="mt-1 text-sm font-semibold text-[var(--amber)]">{fill(t.order.payBefore, { date: dateTime(lockExpiresAt, lang) })}</p>
          {pay.count > 1 && <p className="mt-1 text-xs text-ink/60">{fill(t.checkout.ordersNote, { n: pay.count })}</p>}
        </div>
        <p className="font-display text-3xl font-bold">{pkr(due, lang)}</p>
      </div>

      <div role="radiogroup" aria-label={t.pay.payHow} className="mt-6 grid gap-2.5 sm:grid-cols-2">
        {(["advance", "full"] as const).map((m) => {
          const on = mode === m;
          return (
            <button key={m} type="button" role="radio" aria-checked={on} onClick={() => setMode(m)} className={`rounded-2xl border px-4 py-3 text-start transition ${on ? "border-[var(--amber)] bg-[var(--amber)]/15" : "border-ink/15 hover:border-ink/40"}`}>
              <span className="block text-sm font-semibold">{m === "advance" ? t.pay.advanceOpt.replace("({p}%)", "").trim() : t.pay.fullOpt}</span>
              <span className="font-display mt-1 block text-lg font-bold">{pkr(m === "advance" ? pay.advance : pay.full, lang)}</span>
            </button>
          );
        })}
      </div>

      <p className="mt-6 text-sm font-semibold">{t.order.method}</p>
      <div className="mt-2">{pay.methods.length ? <MethodPicker methods={pay.methods} value={method} onChange={setMethod} /> : <Notice tone="error">{t.checkout.noMethods}</Notice>}</div>
      {err && (
        <Notice tone="error" className="mt-4">
          {err}
        </Notice>
      )}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={start} disabled={busy || !method} className="inline-flex h-12 items-center rounded-full bg-[var(--amber)] px-7 text-sm font-semibold text-black transition hover:bg-white disabled:opacity-50">
          {busy ? t.order.paying : fill(t.order.payNow, { amount: pkr(due, lang) })}
        </button>
        <button onClick={cancel} disabled={busy} className={`h-12 rounded-full px-5 text-sm font-semibold transition ${confirmCancel ? "bg-red-500/90 text-white" : "border border-ink/20 hover:bg-ink/10"}`}>
          {confirmCancel ? t.order.cancelConfirm : t.order.cancel}
        </button>
      </div>
    </section>
  );
}
