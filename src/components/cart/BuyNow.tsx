"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { errorText } from "@/lib/client";
import { useI18n } from "@/i18n/I18nProvider";
import { Notice } from "@/components/ui";
import { useCart } from "./CartProvider";

/** Opens the checkout with only this quotation in the cart. */
export default function BuyNow({ quoteId }: { quoteId: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const { add } = useCart();
  const [err, setErr] = useState("");
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void add(quoteId, 1, true).then((r) => (r.ok ? router.replace("/checkout") : setErr(errorText(t, r.error))));
  }, [add, quoteId, router, t]);
  return (
    <div className="mx-auto max-w-lg px-5 pb-24 pt-40 text-center">
      {err ? <Notice tone="error">{err}</Notice> : <p className="text-ink/60">{t.cart.loading}</p>}
    </div>
  );
}
