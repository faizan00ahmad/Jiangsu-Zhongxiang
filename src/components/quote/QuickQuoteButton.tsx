"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, errorText, rememberQuote } from "@/lib/client";
import { useI18n, useToast } from "@/i18n/I18nProvider";

/** One tap: prices the model's standard build on the server and opens the PKR quotation. */
export default function QuickQuoteButton({ slug, className = "" }: { slug: string; className?: string }) {
  const { t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    const r = await api<{ id: string }>("/api/quotes", { model: slug, config: {} });
    if (!r.ok) {
      setBusy(false);
      toast(errorText(t, r.error), "error");
      return;
    }
    rememberQuote(r.id);
    router.push(`/quote/${r.id}`);
  }

  return (
    <button type="button" onClick={go} disabled={busy} className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-[#111]/20 bg-white px-5 text-sm font-semibold text-[#111] transition hover:bg-[#111] hover:text-white disabled:opacity-60 ${className}`}>
      {busy ? t.customize.quoting : t.customize.quickQuote}
    </button>
  );
}
