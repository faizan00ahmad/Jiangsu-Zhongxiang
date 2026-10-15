"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Logo from "./Logo";
import { useI18n } from "@/i18n/I18nProvider";

/** One-per-session intro: charging counter, logo, curtain lift. Click or Escape skips; a timer guarantees it ends. */
export default function Preloader() {
  const { t } = useI18n();
  const [show, setShow] = useState(true);
  const [n, setN] = useState(0);
  const skip = useRef(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem("zx-intro") === "1";
    } catch {}
    if (seen || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const tm = setTimeout(() => setShow(false), 0);
      return () => clearTimeout(tm);
    }
    window.__lenis?.stop();
    document.documentElement.style.overflow = "hidden";
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      try {
        sessionStorage.setItem("zx-intro", "1");
      } catch {}
      document.documentElement.style.overflow = "";
      window.__lenis?.start();
      setN(100);
      setShow(false);
    };
    const start = performance.now();
    const dur = 1400;
    let raf = 0;
    const loop = (tm: number) => {
      const p = skip.current ? 1 : Math.min(1, (tm - start) / dur);
      setN(Math.round((1 - Math.pow(1 - p, 3)) * 100));
      if (p < 1) raf = requestAnimationFrame(loop);
      else setTimeout(finish, 220);
    };
    raf = requestAnimationFrame(loop);
    const failsafe = setTimeout(finish, 3000);
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        skip.current = true;
        setTimeout(finish, 300);
      }
    };
    window.addEventListener("keydown", esc);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(failsafe);
      window.removeEventListener("keydown", esc);
      document.documentElement.style.overflow = "";
    };
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="pre"
          className="fixed inset-0 z-[320] flex cursor-pointer flex-col items-center justify-center bg-bg"
          onClick={() => {
            skip.current = true;
          }}
          role="presentation"
          initial={{ clipPath: "inset(0 0 0% 0)" }}
          exit={{ clipPath: "inset(0 0 100% 0)" }}
          transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
        >
          <div className="aurora">
            <i />
            <i />
            <i />
          </div>
          <motion.div initial={{ opacity: 0, y: 30, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.8, ease: "easeOut" }} className="relative">
            <Logo size="xl" />
          </motion.div>
          {/* battery-shaped progress */}
          <div className="relative mt-10 flex items-center gap-1" dir="ltr">
            <div className="h-6 w-56 overflow-hidden rounded-md border border-ink/25 p-[3px] md:w-72">
              <motion.div className="h-full rounded-[3px] bg-gradient-to-r from-[var(--volt)] to-[var(--blue)]" style={{ width: `${n}%` }} />
            </div>
            <span className="h-2.5 w-1.5 rounded-r bg-ink/25" />
          </div>
          <div className="font-display latin-d relative mt-5 text-6xl font-light tabular-nums text-ink/90 md:text-8xl">
            {String(n).padStart(2, "0")}
            <span className="text-2xl text-ink/40 md:text-4xl">%</span>
          </div>
          <p className="relative mt-2 text-xs uppercase tracking-[0.4em] text-ink/40">{t.preloader.hint}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
