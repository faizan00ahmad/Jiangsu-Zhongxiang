"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import type { AdminDict } from "@/i18n/admin";
import type { AdminKit } from "@/i18n/admin-kit";
import { has } from "@/lib/perms";
import type { AdminLang } from "@/lib/types";
import { api } from "@/lib/client";
import { fill } from "@/lib/format";

export type Me = { name: string; username: string; role: string; roleName: string; dealerId: string | null; id: string; perms: string[]; scope: "all" | "dealer" } | null;
type Confirm = { text: string; danger: boolean; resolve: (v: boolean) => void };
type Ctx = {
  t: AdminDict;
  k: AdminKit;
  lang: AdminLang;
  me: Me;
  toast: (text: string, tone?: "ok" | "error") => void;
  /** Calls an admin API, toasts the outcome in the admin's language, refreshes server data on success. */
  call: (url: string, body?: unknown, method?: string, quiet?: boolean) => Promise<boolean>;
  err: (code: string) => string;
  can: (perm: string) => boolean;
  /** Promise-based confirm dialog. */
  confirm: (text: string, danger?: boolean) => Promise<boolean>;
};
const C = createContext<Ctx | null>(null);
export const useAdmin = () => {
  const c = useContext(C);
  if (!c) throw new Error("useAdmin outside provider");
  return c;
};

export default function AdminProvider({ t, k, lang, me, children }: { t: AdminDict; k: AdminKit; lang: AdminLang; me: Me; children: React.ReactNode }) {
  const router = useRouter();
  const [toasts, setToasts] = useState<{ id: number; text: string; tone: "ok" | "error" }[]>([]);
  const [ask, setAsk] = useState<Confirm | null>(null);
  const okRef = useRef<HTMLButtonElement>(null);
  const toast = useCallback((text: string, tone: "ok" | "error" = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((l) => [...l.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts((l) => l.filter((x) => x.id !== id)), 3500);
  }, []);
  const err = useCallback((code: string) => (t.errors as Record<string, string>)[code] ?? t.errors.server, [t]);
  const call = useCallback(
    async (url: string, body?: unknown, method = "POST", quiet = false) => {
      const r = await api(url, body, method);
      if (!r.ok) {
        toast(err(r.error), "error");
        return false;
      }
      if (!quiet) toast(t.common.saved);
      router.refresh();
      return true;
    },
    [router, toast, err, t],
  );
  const can = useCallback((perm: string) => !!me && has(me.perms, perm), [me]);
  const confirm = useCallback((text: string, danger = true) => new Promise<boolean>((resolve) => setAsk({ text, danger, resolve })), []);
  const close = (v: boolean) => {
    ask?.resolve(v);
    setAsk(null);
  };
  useEffect(() => {
    if (!ask) return;
    okRef.current?.focus();
    const on = (e: KeyboardEvent) => e.key === "Escape" && (ask.resolve(false), setAsk(null));
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [ask]);

  return (
    <C.Provider value={{ t, k, lang, me, toast, call, err, can, confirm }}>
      {children}
      <AnimatePresence>
        {ask && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[300] grid place-items-center bg-black/55 p-4" onClick={() => close(false)}>
            <motion.div role="alertdialog" aria-modal="true" aria-label={k.form.confirmTitle} initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl border border-ink/12 bg-card p-6 shadow-2xl">
              <h2 className="font-semibold">{k.form.confirmTitle}</h2>
              <p className="mt-2 text-sm text-ink/65">{ask.text}</p>
              <div className="mt-6 flex justify-end gap-2">
                <button onClick={() => close(false)} className="h-9 rounded-lg border border-ink/15 px-4 text-sm hover:bg-ink/10">
                  {k.form.cancel}
                </button>
                <button ref={okRef} onClick={() => close(true)} className={`h-9 rounded-lg px-4 text-sm font-semibold ${ask.danger ? "bg-red-500 text-white hover:bg-red-600" : "bg-[var(--volt)] text-black"}`}>
                  {k.form.yes}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <div aria-live="polite" className="pointer-events-none fixed bottom-6 end-6 z-[400] flex flex-col items-end gap-2">
        <AnimatePresence>
          {toasts.map((x) => (
            <motion.div key={x.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 30 }} className={`glass pointer-events-auto flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm shadow-xl ${x.tone === "error" ? "border-red-500/50" : ""}`}>
              <span className={`h-2 w-2 rounded-full ${x.tone === "error" ? "bg-red-500" : "bg-[var(--volt)]"}`} />
              {x.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </C.Provider>
  );
}

export { fill };
