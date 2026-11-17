"use client";
import { useI18n } from "@/i18n/I18nProvider";

export default function PrintReceipt() {
  const { t } = useI18n();
  return (
    <button type="button" onClick={() => window.print()} className="inline-flex h-12 items-center rounded-full bg-[#111] px-7 text-sm font-semibold text-white">
      {t.pay.receipt.print}
    </button>
  );
}
