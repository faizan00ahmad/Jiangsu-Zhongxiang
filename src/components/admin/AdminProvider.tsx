"use client";
import { createContext, useCallback, useContext, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import type { AdminDict } from "@/i18n/admin";
import type { AdminLang, AdminRole } from "@/lib/types";
import { api } from "@/lib/client";
import { fill } from "@/lib/format";

type Me = { name: string; username: string; role: AdminRole; dealerId: string | null; id: string } | null;
type Ctx = {
  t: AdminDict;
  lang: AdminLang;
  me: Me;
  toast: (text: string, tone?: "ok" | "error") => void;
  /** Calls an admin API, toasts the outcome in the admin's language, refreshes server data on success. */
  call: (url: string, body?: unknown, method?: string) => Promise<boolean>;
  err: (code: string) => string;
};
const C = createContext<Ctx | null>(null);
export const useAdmin = () => {
  const c = useContext(C);
  if (!c) throw new Error("useAdmin outside provider");
  return c;
};

export default function AdminProvider({ t, lang, me, children }: { t: AdminDict; lang: AdminLang; me: Me; children: React.ReactNode }) {
  const router = useRouter();
  const [toasts, setToasts] = useState<{ id: number; text: string; tone: "ok" | "error" }[]>([]);
  const toast = useCallback((text: string, tone: "ok" | "error" = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((l) => [...l.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts((l) => l.filter((x) => x.id !== id)), 3500);
  }, []);
  const err = useCallback((code: string) => (t.errors as Record<string, string>)[code] ?? t.errors.server, [t]);
  const call = useCallback(
    async (url: string, body?: unknown, method = "POST") => {
      const r = await api(url, body, method);
      if (!r.ok) {
        toast(err(r.error), "error");
        return false;
      }
      toast(t.common.saved);
      router.refresh();
      return true;
    },
    [router, toast, err, t],
  );
  return (
    <C.Provider value={{ t, lang, me, toast, call, err }}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-6 end-6 z-[200] flex flex-col items-end gap-2">
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
