"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useI18n } from "@/i18n/I18nProvider";
import { KIND_META, KIND_ORDER } from "@/lib/catalog";
import { pkr } from "@/lib/format";
import type { VehicleKind } from "@/lib/types";
import Logo from "./Logo";
import LangSwitch from "./LangSwitch";
import Vehicle from "./vehicle/Vehicle";
import { Chevron, ChevronFwd, User } from "./Icons";
import { IconConfigure, IconOrders, IconStock, IconTrack } from "./CoreIcons";

export const CORE_ENTRIES = [
  { key: "customize", href: "/customize", Icon: IconConfigure, color: "#16b364", rgb: "22,179,100" },
  { key: "inventory", href: "/inventory", Icon: IconStock, color: "#f59e0b", rgb: "245,158,11" },
  { key: "orders", href: "/orders", Icon: IconOrders, color: "#3d8bff", rgb: "61,139,255" },
  { key: "tracking", href: "/tracking", Icon: IconTrack, color: "#ef4444", rgb: "239,68,68" },
] as const;

export type NavModel = { slug: string; name: string; kind: VehicleKind; variant: number; color: string; basePrice: number; thumb: string | null };

function NavThumb({ m }: { m: NavModel }) {
  // eslint-disable-next-line @next/next/no-img-element
  if (m.thumb) return <img src={m.thumb} alt="" loading="lazy" className="aspect-[1000/560] w-full object-contain mix-blend-multiply" />;
  return <Vehicle kind={m.kind} variant={m.variant} color={m.color} accent={KIND_META[m.kind].accent} reflection={false} className="aspect-[1000/560] w-full" />;
}

/** REVOO-style header: dark translucent bar, logo left, Products mega menu + the four core entries right. */
export default function Navbar({ user, models }: { user: { name: string } | null; models: NavModel[] }) {
  const { t, tx, lang } = useI18n();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [mobileFor, setMobileFor] = useState<string | null>(null);
  const [mobProducts, setMobProducts] = useState(false);
  const products = menuFor === pathname; // both close themselves on navigation
  const mobile = mobileFor === pathname;

  useEffect(() => {
    let last = window.scrollY;
    const on = () => {
      const y = window.scrollY;
      setScrolled(y > 30);
      setHidden(y > last && y > 160);
      last = y;
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    document.documentElement.style.overflow = mobile ? "hidden" : "";
  }, [mobile]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMobileFor(null);
      setMenuFor(null);
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, []);

  const active = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const byKind = KIND_ORDER.map((k) => ({ k, list: models.filter((m) => m.kind === k) })).filter((g) => g.list.length);

  return (
    <header className="no-print fixed inset-x-0 top-0 z-[100]" onMouseLeave={() => setMenuFor(null)}>
      <motion.div
        initial={{ y: -80 }}
        animate={{ y: hidden && !mobile && !products ? -80 : 0 }}
        transition={{ type: "spring", stiffness: 160, damping: 22 }}
        className={`relative transition-colors duration-500 ${scrolled || products ? "bg-[#1b1b1d]/95" : "bg-[#2a2a2c]/60"} backdrop-blur-md`}
      >
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
          <Link href="/" aria-label={t.nav.home} className="shrink-0">
            <Logo size="nav" tone="white" />
          </Link>

          <nav className="hidden items-center gap-1 xl:flex" aria-label="Primary">
            <button
              onMouseEnter={() => setMenuFor(pathname)}
              onClick={() => setMenuFor(products ? null : pathname)}
              aria-expanded={products}
              className={`flex items-center gap-1 rounded-md px-3 py-2 text-[13px] font-medium text-white/85 transition hover:text-white ${products ? "text-white" : ""}`}
            >
              {t.nav.products}
              <Chevron size={14} className={`transition-transform ${products ? "rotate-180" : ""}`} />
            </button>
            {CORE_ENTRIES.map(({ key, href }) => (
              <Link key={key} href={href} onMouseEnter={() => setMenuFor(null)} aria-current={active(href) ? "page" : undefined} className={`relative rounded-md px-3 py-2 text-[13px] font-medium transition ${active(href) ? "text-white" : "text-white/75 hover:text-white"}`}>
                {t.nav[key]}
                {active(href) && <motion.span layoutId="nav-underline" className="absolute inset-x-3 -bottom-0.5 h-[2px] rounded bg-[var(--volt)]" />}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <LangSwitch tone="white" />
            <Link href={user ? "/account" : "/login"} className="hidden h-9 items-center gap-2 rounded-md bg-white px-3.5 text-[13px] font-semibold text-[#111] transition hover:bg-white/90 md:inline-flex">
              <User size={15} />
              <span className="max-w-[8rem] truncate">{user ? user.name.split(" ")[0] : t.nav.login}</span>
            </Link>
            <button aria-label={t.nav.menu} aria-expanded={mobile} onClick={() => setMobileFor(mobile ? null : pathname)} className="relative z-[110] flex h-10 w-10 flex-col items-center justify-center gap-1.5 xl:hidden">
              <span className={`h-[2px] w-6 transition-transform ${mobile ? "translate-y-[5px] rotate-45 bg-[#111]" : "bg-white"}`} />
              <span className={`h-[2px] w-6 bg-white transition-opacity ${mobile ? "opacity-0" : ""}`} />
              <span className={`h-[2px] w-6 transition-transform ${mobile ? "-translate-y-[5px] -rotate-45 bg-[#111]" : "bg-white"}`} />
            </button>
          </div>
        </div>

        {/* Products mega menu */}
        <AnimatePresence>
          {products && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }} className="absolute inset-x-0 top-full hidden border-t border-black/5 bg-white shadow-[0_30px_60px_-30px_rgba(0,0,0,0.35)] xl:block">
              <div className="mx-auto grid max-w-[1440px] grid-cols-4 gap-8 px-10 py-8">
                {byKind.map(({ k, list }) => (
                  <div key={k}>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">{tx(KIND_META[k].label)}</p>
                    <ul className="space-y-1">
                      {list.map((m) => (
                        <li key={m.slug}>
                          <Link href={`/customize/${m.slug}`} className="group flex items-center gap-3 rounded-lg p-1.5 transition hover:bg-[#f4f4f5]">
                            <span className="w-20 shrink-0">
                              <NavThumb m={m} />
                            </span>
                            <span className="min-w-0">
                              <span className="latin-d block truncate text-sm font-semibold text-ink">{m.name}</span>
                              <span className="block text-xs text-ink/50">
                                {t.common.from} {pkr(m.basePrice, lang)}
                              </span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="border-t border-black/5 bg-[#fafafa]">
                <Link href="/customize" className="mx-auto flex max-w-[1440px] items-center gap-1 px-10 py-3 text-sm font-semibold text-ink hover:text-[var(--volt)]">
                  {t.nav.allProducts} <ChevronFwd size={14} className="text-[var(--volt)]" />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* mobile menu */}
      <AnimatePresence>
        {mobile && (
          <motion.div
            initial={{ clipPath: "circle(0% at 95% 3%)" }}
            animate={{ clipPath: "circle(150% at 95% 3%)" }}
            exit={{ clipPath: "circle(0% at 95% 3%)" }}
            transition={{ duration: 0.65, ease: [0.76, 0, 0.24, 1] }}
            className="fixed inset-0 z-[105] overflow-y-auto bg-white px-6 pb-10 pt-24 xl:hidden"
            data-lenis-prevent
          >
            <ul className="space-y-1">
              <motion.li initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="border-b border-black/10">
                <button onClick={() => setMobProducts((v) => !v)} aria-expanded={mobProducts} className="font-display flex w-full items-center justify-between py-4 text-xl font-semibold text-ink">
                  {t.nav.products}
                  <Chevron className={`transition-transform ${mobProducts ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence initial={false}>
                  {mobProducts && (
                    <motion.ul initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                      {models.map((m) => (
                        <li key={m.slug}>
                          <Link href={`/customize/${m.slug}`} className="flex items-center gap-3 py-2">
                            <span className="w-16 shrink-0">
                              <NavThumb m={m} />
                            </span>
                            <span className="latin-d text-[15px] font-medium text-ink">{m.name}</span>
                          </Link>
                        </li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </motion.li>
              {CORE_ENTRIES.map((m, i) => (
                <motion.li key={m.href} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.05 }} className="border-b border-black/10">
                  <Link href={m.href} className="font-display flex items-center gap-3 py-4 text-xl font-semibold text-ink">
                    <m.Icon size={22} className="ico-static" style={{ color: m.color }} />
                    {t.nav[m.key]}
                  </Link>
                </motion.li>
              ))}
            </ul>
            <Link href={user ? "/account" : "/login"} className="mt-8 flex h-12 items-center justify-center gap-2 rounded-md bg-[#111] font-semibold text-white">
              <User size={18} />
              {user ? t.nav.account : t.nav.login}
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
