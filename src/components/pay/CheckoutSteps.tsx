"use client";
import { useI18n } from "@/i18n/I18nProvider";

/** Cart → Details → Payment → Done. `at` is the step the customer is on (0 to 3). */
export default function CheckoutSteps({ at }: { at: number }) {
  const { t } = useI18n();
  return (
    <ol className="mx-auto mb-8 flex max-w-2xl items-center justify-center gap-2 px-5 text-xs font-semibold sm:gap-3 sm:text-sm" aria-label="Checkout steps">
      {t.checkout.steps.map((label, i) => (
        <li key={label} className="flex items-center gap-2 sm:gap-3" aria-current={i === at ? "step" : undefined}>
          <span className={`grid h-7 w-7 place-items-center rounded-full text-xs ${i < at ? "bg-[var(--accent)] text-black" : i === at ? "bg-[#111] text-white" : "bg-ink/10 text-ink/50"}`}>{i < at ? "✓" : i + 1}</span>
          <span className={i === at ? "text-ink" : "text-ink/50"}>{label}</span>
          {i < t.checkout.steps.length - 1 && <span aria-hidden className="h-px w-4 bg-ink/20 sm:w-8" />}
        </li>
      ))}
    </ol>
  );
}
