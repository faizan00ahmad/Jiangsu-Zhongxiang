"use client";
import { createContext, useCallback, useContext, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Lang } from "@/lib/types";
import type { SiteDict } from "./site";

type Ctx = { lang: Lang; t: SiteDict; tx: <T extends { en: string; ur: string }>(v: T) => string };
const I18n = createContext<Ctx | null>(null);

export function useI18n() {
  const c = useContext(I18n);
  if (!c) throw new Error("useI18n outside provider");
  return c;
}

type Toast = { id: number; text: string; tone: "ok" | "error" | "info" };
const ToastCtx = createContext<(text: string, tone?: Toast["tone"]) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

/** Language + bilingual toasts (inline notices, not blocking pop-ups). */
export default function I18nProvider({ lang, t, children }: { lang: Lang; t: SiteDict; children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const tx = useCallback(<T extends { en: string; ur: string }>(v: T) => v[lang] || v.en, [lang]);
  const push = useCallback((text: string, tone: Toast["tone"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts((l) => [...l.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts((l) => l.filter((x) => x.id !== id)), 4200);
  }, []);
  return (
    <I18n.Provider value={{ lang, t, tx }}>
      <ToastCtx.Provider value={push}>
        {children}
        <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-[260] flex flex-col items-center gap-2 px-4 no-print">
          <AnimatePresence>
            {toasts.map((x) => (
              <motion.div
                key={x.id}
                initial={{ opacity: 0, y: 24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.96 }}
                className={`glass pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl px-5 py-3 text-sm shadow-2xl ${x.tone === "error" ? "border-red-500/40" : ""}`}
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${x.tone === "error" ? "bg-red-500" : x.tone === "ok" ? "bg-[var(--volt)]" : "bg-[var(--blue)]"}`} />
                {x.text}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </ToastCtx.Provider>
    </I18n.Provider>
  );
}
