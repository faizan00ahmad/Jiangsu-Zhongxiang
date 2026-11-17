"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { errorText } from "@/lib/client";
import { useI18n, useToast } from "@/i18n/I18nProvider";
import type { Config } from "@/lib/types";
import { CartIcon } from "@/components/Icons";
import { useCart } from "./CartProvider";

/** Adds a bike to the cart. With `config` it is the build on screen; without, the model's standard build (the quick button on cards). */
export default function AddToCart({ slug, config, className = "", buyNow = false, children }: { slug: string; config?: Config; className?: string; buyNow?: boolean; children?: React.ReactNode }) {
  const { t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const { addBuild } = useCart();
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    const r = await addBuild(slug, config ?? {}, buyNow);
    setBusy(false);
    if (!r.ok) return toast(errorText(t, r.error), "error");
    if (buyNow) return router.push("/checkout");
    toast(t.cart.added, "ok");
  }

  return (
    <button type="button" onClick={go} disabled={busy} className={className}>
      {children ?? (
        <>
          <CartIcon size={16} /> {busy ? t.cart.adding : t.cart.add}
        </>
      )}
    </button>
  );
}

/** The header button: a cart icon with the number of bikes in it. */
export function CartLink({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  const { count } = useCart();
  return (
    <Link href="/cart" aria-label={`${t.cart.view}${count ? ` (${count})` : ""}`} className={`relative grid h-9 w-9 place-items-center rounded-md border border-white/25 text-white transition hover:bg-white/10 ${className}`}>
      <CartIcon size={18} />
      {count > 0 && <span className="absolute -end-1.5 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[var(--volt)] px-1 text-[10px] font-bold text-black">{count}</span>}
    </Link>
  );
}

/** The same button for a quotation that already exists (the quote page). */
export function AddQuoteToCart({ quoteId, className = "" }: { quoteId: string; className?: string }) {
  const { t } = useI18n();
  const toast = useToast();
  const { add } = useCart();
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    const r = await add(quoteId, 1, false);
    setBusy(false);
    toast(r.ok ? t.cart.added : errorText(t, r.error), r.ok ? "ok" : "error");
  }
  return (
    <button type="button" onClick={go} disabled={busy} className={className}>
      <CartIcon size={16} /> {busy ? t.cart.adding : t.cart.add}
    </button>
  );
}
