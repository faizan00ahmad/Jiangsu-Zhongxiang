"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n, useToast } from "@/i18n/I18nProvider";
import { dateTime, fill, pkr } from "@/lib/format";
import { api, errorText } from "@/lib/client";
import type { PayMethod } from "@/lib/types";
import { Bank, Card, Lock, Mobile, Wallet } from "@/components/Icons";
import { Button, Notice } from "@/components/ui";

const METHODS: { id: PayMethod; I: typeof Wallet }[] = [
  { id: "jazzcash", I: Mobile },
  { id: "easypaisa", I: Wallet },
  { id: "bank", I: Bank },
  { id: "card", I: Card },
];

/** Advance payment + cancel-before-payment, shown only while the order awaits its deposit. */
export default function PayPanel({ orderId, deposit, lockExpiresAt }: { orderId: string; deposit: number; lockExpiresAt: string }) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [method, setMethod] = useState<PayMethod>("jazzcash");
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [err, setErr] = useState("");

  async function pay() {
    setBusy(true);
    setErr("");
    const r = await api(`/api/orders/${orderId}/pay`, { method });
    setBusy(false);
    if (!r.ok) return setErr(errorText(t, r.error));
    toast(t.order.paid, "ok");
    router.refresh();
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

  return (
    <section className="relative overflow-hidden rounded-3xl border border-[var(--amber)]/40 bg-[var(--amber)]/[0.06] p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <h2 className="font-display flex items-center gap-2 text-2xl font-semibold">
            <Lock size={22} className="text-[var(--amber)]" />
            {t.order.payTitle}
          </h2>
          <p className="mt-2 text-ink/70">{fill(t.order.payText, { amount: pkr(deposit, lang) })}</p>
          <p className="mt-1 text-sm font-semibold text-[var(--amber)]">{fill(t.order.payBefore, { date: dateTime(lockExpiresAt, lang) })}</p>
        </div>
        <p className="font-display text-3xl font-bold">{pkr(deposit, lang)}</p>
      </div>
      <p className="mt-6 text-sm font-semibold">{t.order.method}</p>
      <div role="radiogroup" aria-label={t.order.method} className="mt-2 grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {METHODS.map(({ id, I }) => {
          const on = method === id;
          return (
            <button key={id} type="button" role="radio" aria-checked={on} onClick={() => setMethod(id)} className={`flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${on ? "border-[var(--amber)] bg-[var(--amber)]/15" : "border-ink/12 hover:border-ink/35"}`}>
              <I size={18} />
              {t.order.methods[id]}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-ink/50">{t.order.sandbox}</p>
      {err && (
        <Notice tone="error" className="mt-4">
          {err}
        </Notice>
      )}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button onClick={pay} disabled={busy} magnetic={false} className="!bg-[var(--amber)] hover:!bg-white">
          {busy ? t.order.paying : fill(t.order.payNow, { amount: pkr(deposit, lang) })}
        </Button>
        <button onClick={cancel} disabled={busy} className={`h-12 rounded-full px-5 text-sm font-semibold transition ${confirmCancel ? "bg-red-500/90 text-white" : "border border-ink/20 hover:bg-ink/10"}`}>
          {confirmCancel ? t.order.cancelConfirm : t.order.cancel}
        </button>
      </div>
    </section>
  );
}
