"use client";
import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";

/** Centered dialog (bottom sheet on phones). Esc and the backdrop close it; focus moves in and returns when it closes. */
export default function Modal({ open, onClose, title, children, footer, wide = false }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const before = document.activeElement as HTMLElement | null;
    const first = panel.current?.querySelector<HTMLElement>("input,select,textarea,button:not([data-close])");
    first?.focus();
    const on = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab" || !panel.current) return;
      const items = [...panel.current.querySelectorAll<HTMLElement>("a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex='-1'])")].filter((x) => x.offsetParent !== null);
      if (!items.length) return;
      const f = items[0];
      const l = items[items.length - 1];
      if (e.shiftKey && document.activeElement === f) (e.preventDefault(), l.focus());
      else if (!e.shiftKey && document.activeElement === l) (e.preventDefault(), f.focus());
    };
    document.addEventListener("keydown", on);
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", on);
      document.documentElement.style.overflow = "";
      before?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[250] flex items-end justify-center bg-black/55 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className={`flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-ink/12 bg-card shadow-2xl sm:rounded-2xl ${wide ? "sm:max-w-3xl" : "sm:max-w-xl"}`}
          >
            <header className="flex items-center justify-between gap-3 border-b border-ink/10 px-5 py-4">
              <h2 className="font-semibold">{title}</h2>
              <button data-close onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-lg text-ink/55 hover:bg-ink/10 hover:text-ink">
                ✕
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-5" data-lenis-prevent>
              {children}
            </div>
            {footer && <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-ink/10 px-5 py-3">{footer}</footer>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
