"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useI18n } from "@/i18n/I18nProvider";
import Logo from "./Logo";
import { CORE_ENTRIES } from "./Navbar";
import { ArrowUp, Pin } from "./Icons";

/** Black REVOO-style footer: logo row, about text, uppercase link column, legal bar. */
export default function Footer() {
  const { t } = useI18n();
  return (
    <footer className="no-print mt-16 bg-[#111] text-white">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <div className="flex items-center justify-between border-b border-white/10 py-6">
          <Logo size="nav" tone="white" />
          <Link href="/customize" className="hidden rounded-md border border-white/25 px-4 py-2 text-sm font-semibold transition hover:bg-white hover:text-black sm:inline-block">
            {t.home.ctaButton}
          </Link>
        </div>
        <div className="grid gap-10 py-12 md:grid-cols-[1.3fr_1fr]">
          <div>
            <p className="max-w-md text-sm leading-relaxed text-white/60">{t.footer.about}</p>
            <p className="mt-6 flex items-start gap-3 text-sm text-white/60">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/20">
                <Pin size={14} />
              </span>
              <span>
                {t.footer.hq}
                <br />
                {t.footer.pk}
              </span>
            </p>
          </div>
          <ul className="space-y-4 border-white/10 md:border-s md:ps-10">
            {CORE_ENTRIES.map((e) => (
              <li key={e.href}>
                <Link href={e.href} className="text-sm font-medium uppercase tracking-wider text-white/85 underline-offset-8 transition hover:text-white hover:underline">
                  {t.nav[e.key]}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/account" className="text-sm font-medium uppercase tracking-wider text-white/85 underline-offset-8 transition hover:text-white hover:underline">
                {t.nav.account}
              </Link>
            </li>
          </ul>
        </div>
        <div className="flex flex-col items-center justify-between gap-3 border-t border-white/10 py-6 text-xs text-white/45 md:flex-row">
          <p>
            © <span className="latin">{process.env.NEXT_PUBLIC_YEAR}</span> {t.brand.name} {t.brand.sub}. {t.footer.rights}
          </p>
          <p className="flex items-center gap-4">
            <span>{t.common.pkrNote}</span>
            <a href="/admin" className="rounded border border-white/20 px-2.5 py-1 text-white/70 transition hover:bg-white hover:text-black">
              {t.footer.admin}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

export function BackToTop() {
  const { t } = useI18n();
  const [show, setShow] = useState(false);
  useEffect(() => {
    const on = () => setShow(window.scrollY > 700);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <AnimatePresence>
      {show && (
        <motion.button
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.6 }}
          onClick={() => (window.__lenis ? window.__lenis.scrollTo(0) : window.scrollTo({ top: 0, behavior: "smooth" }))}
          aria-label={t.nav.backToTop}
          className="no-print fixed bottom-6 end-6 z-[90] grid h-11 w-11 place-items-center rounded-full border border-black/10 bg-white text-[#111] shadow-lg transition hover:bg-[#111] hover:text-white"
        >
          <ArrowUp size={18} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
