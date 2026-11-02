"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useI18n } from "@/i18n/I18nProvider";
import Logo from "./Logo";
import { ArrowUp, Mail, Phone, Pin } from "./Icons";
import SocialLinks from "./SocialLinks";
import type { SiteConfig } from "@/lib/server/siteConfig";

/** Black REVOO-style footer: logo row, about text, contact details and social links, menu links from the admin, legal bar. */
export default function Footer({ cfg }: { cfg: Pick<SiteConfig, "footer" | "company" | "social"> }) {
  const { t, tx } = useI18n();
  const { company: co, social } = cfg;
  const li = "text-sm font-medium uppercase tracking-wider text-white/85 underline-offset-8 transition hover:text-white hover:underline";
  return (
    <footer className="no-print mt-16 bg-[#111] text-white">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <div className="flex items-center justify-between border-b border-white/10 py-6">
          <Logo size="nav" tone="white" />
          <Link href="/customize" className="hidden rounded-md border border-white/25 px-4 py-2 text-sm font-semibold transition hover:bg-white hover:text-black sm:inline-block">
            {t.home.ctaButton}
          </Link>
        </div>
        <div className="grid gap-10 py-12 md:grid-cols-[1.3fr_1fr_1fr]">
          <div>
            <p className="max-w-md text-sm leading-relaxed text-white/60">{t.footer.about}</p>
            <ul className="mt-6 space-y-3 text-sm text-white/65">
              <li className="flex items-start gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/20">
                  <Pin size={14} />
                </span>
                <span className="pt-1">{tx(co.address)}</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/20">
                  <Mail size={14} />
                </span>
                <a href={`mailto:${co.email}`} className="latin hover:text-white" dir="ltr">
                  {co.email}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/20">
                  <Phone size={14} />
                </span>
                <a href={`tel:${co.phone.replace(/\s/g, "")}`} className="latin hover:text-white" dir="ltr">
                  {co.phone}
                </a>
              </li>
            </ul>
            <div className="mt-6">
              <SocialLinks social={social} tone="dark" />
            </div>
          </div>
          <ul className="space-y-4 border-white/10 md:border-s md:ps-10">
            {cfg.footer.map((l) => (
              <li key={l.href + l.label.en}>
                <Link href={l.href} className={li} {...(l.newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                  {tx(l.label)}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/account" className={li}>
                {t.nav.account}
              </Link>
            </li>
          </ul>
          <ul className="space-y-4 border-white/10 md:border-s md:ps-10">
            <li>
              <Link href="/contact" className={li}>
                {t.contact.title}
              </Link>
            </li>
            <li>
              <Link href="/test-drive" className={li}>
                {t.testDrive.cta}
              </Link>
            </li>
            <li>
              <Link href="/partner" className={li}>
                {t.contact.partnerCta}
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
            <Link href="/admin" prefetch={false} className="rounded border border-white/20 px-2.5 py-1 text-white/70 transition hover:bg-white hover:text-black">
              {t.footer.admin}
            </Link>
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
