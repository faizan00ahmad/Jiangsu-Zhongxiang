"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, clearDeviceCart, deviceCart, rememberQuote, setDeviceCart } from "@/lib/client";
import type { CartItem, Config } from "@/lib/types";

const MAX_QTY = 5;
const MAX_UNITS = 10;

export type CartEntry = { id?: string; quoteId: string; qty: number };
type Result = { ok: true } | { ok: false; error: string };
type Ctx = {
  items: CartEntry[];
  count: number;
  loggedIn: boolean;
  add: (quoteId: string, qty?: number, replace?: boolean) => Promise<Result>;
  addBuild: (slug: string, config: Config, replace?: boolean) => Promise<Result & { quoteId?: string }>;
  setQty: (e: CartEntry, qty: number) => Promise<Result>;
  remove: (e: CartEntry) => Promise<Result>;
  reload: () => Promise<void>;
};
const CartCtx = createContext<Ctx>({ items: [], count: 0, loggedIn: false, add: async () => ({ ok: false, error: "server" }), addBuild: async () => ({ ok: false, error: "server" }), setQty: async () => ({ ok: false, error: "server" }), remove: async () => ({ ok: false, error: "server" }), reload: async () => {} });

const units = (l: CartEntry[]) => l.reduce((s, x) => s + x.qty, 0);
const clamp = (n: number) => Math.max(1, Math.min(MAX_QTY, Math.round(n)));

/** The cart of whoever is on the site: kept on the server for a signed-in customer, in the browser for a guest (it joins the account on sign-in).
 *  The browser only ever holds quotation ids and quantities; every price comes from the server. */
export default function CartProvider({ initial, loggedIn, children }: { initial: CartItem[]; loggedIn: boolean; children: React.ReactNode }) {
  const [items, setItems] = useState<CartEntry[]>(loggedIn ? initial : []);

  // a guest's cart is read once the page is in the browser
  useEffect(() => {
    if (loggedIn) return;
    const id = setTimeout(() => setItems(deviceCart()), 0);
    return () => clearTimeout(id);
  }, [loggedIn]);

  const reload = useCallback(async () => {
    if (!loggedIn) return setItems(deviceCart());
    const r = await api<{ items: CartItem[] }>("/api/cart", undefined, "GET");
    if (r.ok) setItems(r.items);
  }, [loggedIn]);

  const guest = useCallback((next: CartEntry[]): Result => {
    if (units(next) > MAX_UNITS) return { ok: false, error: "cart_full" };
    setDeviceCart(next.map((x) => ({ quoteId: x.quoteId, qty: x.qty })));
    setItems(next);
    return { ok: true };
  }, []);

  const add = useCallback(
    async (quoteId: string, qty = 1, replace = false): Promise<Result> => {
      if (loggedIn) {
        const r = await api<{ items: CartItem[] }>("/api/cart", { quoteId, qty, replace });
        if (!r.ok) return r;
        setItems(r.items);
        return { ok: true };
      }
      const base = replace ? [] : deviceCart().map((x) => ({ ...x }));
      const have = base.find((x) => x.quoteId === quoteId);
      if (have) have.qty = clamp(have.qty + qty);
      else base.push({ quoteId, qty: clamp(qty) });
      return guest(base);
    },
    [loggedIn, guest],
  );

  const addBuild = useCallback(
    async (slug: string, config: Config, replace = false) => {
      const q = await api<{ id: string }>("/api/quotes", { model: slug, config });
      if (!q.ok) return q;
      rememberQuote(q.id); // a guest's quotation can be claimed on sign-in
      const r = await add(q.id, 1, replace);
      return r.ok ? { ok: true as const, quoteId: q.id } : r;
    },
    [add],
  );

  const setQty = useCallback(
    async (e: CartEntry, qty: number): Promise<Result> => {
      if (loggedIn) {
        if (!e.id) return { ok: false, error: "not_found" };
        const r = await api<{ items: CartItem[] }>("/api/cart", { id: e.id, qty }, "PATCH");
        if (!r.ok) return r;
        setItems(r.items);
        return { ok: true };
      }
      return guest(deviceCart().map((x) => (x.quoteId === e.quoteId ? { ...x, qty: clamp(qty) } : x)));
    },
    [loggedIn, guest],
  );

  const remove = useCallback(
    async (e: CartEntry): Promise<Result> => {
      if (loggedIn) {
        const r = await api<{ items: CartItem[] }>("/api/cart", { id: e.id }, "DELETE");
        if (!r.ok) return r;
        setItems(r.items);
        return { ok: true };
      }
      const next = deviceCart().filter((x) => x.quoteId !== e.quoteId);
      if (!next.length) clearDeviceCart();
      return guest(next);
    },
    [loggedIn, guest],
  );

  const value = useMemo<Ctx>(() => ({ items, count: units(items), loggedIn, add, addBuild, setQty, remove, reload }), [items, loggedIn, add, addBuild, setQty, remove, reload]);
  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export const useCart = () => useContext(CartCtx);
