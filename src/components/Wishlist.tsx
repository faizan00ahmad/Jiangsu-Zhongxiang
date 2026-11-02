"use client";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { useI18n, useToast } from "@/i18n/I18nProvider";
import { Heart } from "./Icons";

type Ctx = { list: string[]; has: (slug: string) => boolean; toggle: (slug: string) => void };
const WishCtx = createContext<Ctx>({ list: [], has: () => false, toggle: () => {} });

/** Saved models of the signed-in customer. Guests who tap a heart are sent to log in and come back to the same page. */
export default function WishlistProvider({ initial, loggedIn, children }: { initial: string[]; loggedIn: boolean; children: React.ReactNode }) {
  const [list, setList] = useState<string[]>(initial);
  const router = useRouter();
  const path = usePathname();
  const toast = useToast();
  const { t } = useI18n();
  const toggle = useCallback(
    async (slug: string) => {
      if (!loggedIn) return router.push(`/login?next=${encodeURIComponent(path)}`);
      const on = !list.includes(slug);
      setList((l) => (on ? [slug, ...l] : l.filter((x) => x !== slug)));
      const r = await api<{ list: string[] }>("/api/wishlist", { model: slug, on });
      if (!r.ok) {
        setList((l) => (on ? l.filter((x) => x !== slug) : [slug, ...l]));
        return toast(t.errors.server, "error");
      }
      setList(r.list);
      toast(on ? t.wishlist.added : t.wishlist.removed);
    },
    [list, loggedIn, router, path, toast, t],
  );
  const value = useMemo(() => ({ list, has: (s: string) => list.includes(s), toggle }), [list, toggle]);
  return <WishCtx.Provider value={value}>{children}</WishCtx.Provider>;
}

export const useWishlist = () => useContext(WishCtx);

export function WishHeart({ slug, className = "" }: { slug: string; className?: string }) {
  const { has, toggle } = useWishlist();
  const { t } = useI18n();
  const on = has(slug);
  return (
    <button
      type="button"
      onClick={() => toggle(slug)}
      aria-pressed={on}
      aria-label={on ? t.wishlist.remove : t.wishlist.add}
      title={on ? t.wishlist.remove : t.wishlist.add}
      className={`grid h-9 w-9 place-items-center rounded-full border border-black/10 bg-white/90 text-[#111] shadow-sm backdrop-blur transition hover:scale-110 ${className}`}
    >
      <Heart size={17} className={on ? "fill-red-500 text-red-500" : ""} />
    </button>
  );
}
