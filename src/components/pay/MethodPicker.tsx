"use client";
import { useI18n } from "@/i18n/I18nProvider";
import type { PayMethod } from "@/lib/types";
import { Bank, Card, Mobile, Wallet } from "@/components/Icons";

const ICON: Record<PayMethod, typeof Wallet> = { jazzcash: Mobile, easypaisa: Wallet, card: Card, bank: Bank };

/** The payment methods the store currently offers, as a radio group. */
export default function MethodPicker({ methods, value, onChange }: { methods: PayMethod[]; value: PayMethod | ""; onChange: (m: PayMethod) => void }) {
  const { t } = useI18n();
  return (
    <div role="radiogroup" aria-label={t.checkout.payTitle} className="grid gap-2.5 sm:grid-cols-2">
      {methods.map((m) => {
        const I = ICON[m];
        const on = value === m;
        return (
          <button key={m} type="button" role="radio" aria-checked={on} onClick={() => onChange(m)} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-start transition ${on ? "border-[var(--accent)] bg-[var(--accent)]/10" : "border-ink/15 hover:border-ink/40"}`}>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink/[0.06]">
              <I size={20} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{t.pay.methods[m]}</span>
              <span className="block text-xs text-ink/55">{t.pay.methodHint[m]}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
