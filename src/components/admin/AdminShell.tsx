"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { ROLE_ACCESS } from "@/lib/roles";
import { api } from "@/lib/client";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { Boxes, Gauge, Globe, Logout, Receipt, Shield, Sliders, Spark, Truck, User } from "@/components/Icons";
import { useAdmin } from "./AdminProvider";
import AdminLangSwitch from "./AdminLangSwitch";

const NAV = [
  { key: "dashboard", href: "/admin", I: Gauge },
  { key: "models", href: "/admin/models", I: Spark },
  { key: "options", href: "/admin/options", I: Sliders },
  { key: "inventory", href: "/admin/inventory", I: Boxes },
  { key: "orders", href: "/admin/orders", I: Receipt },
  { key: "logistics", href: "/admin/logistics", I: Truck },
  { key: "users", href: "/admin/users", I: User },
  { key: "admins", href: "/admin/admins", I: Shield },
  { key: "settings", href: "/admin/settings", I: Sliders },
] as const;

export default function AdminShell({ children, dealerName, badge }: { children: React.ReactNode; dealerName: string | null; badge: number }) {
  const { t, me } = useAdmin();
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const items = NAV.filter((n) => me && ROLE_ACCESS[me.role].includes(n.key));
  const active = (href: string) => (href === "/admin" ? path === "/admin" : path.startsWith(href));

  const side = (
    <nav className="flex h-full flex-col gap-1 p-3" aria-label="Admin">
      <Link href="/admin" className="mb-4 px-2 pt-2">
        <Logo size="nav" />
      </Link>
      {items.map(({ key, href, I }) => (
        <Link key={key} href={href} onClick={() => setOpen(false)} className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${active(href) ? "text-ink" : "text-ink/60 hover:bg-ink/[0.06] hover:text-ink"}`}>
          {active(href) && <motion.span layoutId="adm-nav" className="absolute inset-0 rounded-xl bg-ink/10" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
          <I size={17} className="relative" />
          <span className="relative flex-1">{t.nav[key]}</span>
          {key === "orders" && badge > 0 && <span className="relative rounded-full bg-[var(--amber)] px-1.5 text-[11px] font-bold text-black">{badge}</span>}
        </Link>
      ))}
      <div className="mt-auto space-y-1 border-t border-ink/10 pt-3">
        <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-ink/60 hover:bg-ink/[0.06] hover:text-ink">
          <Globe size={17} /> {t.nav.site}
        </a>
        <button
          onClick={async () => {
            await api("/api/admin/logout", {});
            router.replace("/admin/login");
            router.refresh();
          }}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-ink/60 hover:bg-ink/[0.06] hover:text-ink"
        >
          <Logout size={17} /> {t.nav.logout}
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="sticky top-0 hidden h-screen border-e border-ink/10 bg-card/60 lg:block">{side}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <aside className="relative h-full w-64 bg-card" onClick={(e) => e.stopPropagation()}>
            {side}
          </aside>
        </div>
      )}
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-ink/10 bg-bg/80 px-4 py-3 backdrop-blur-xl md:px-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setOpen(true)} className="grid h-9 w-9 place-items-center rounded-lg border border-ink/15 lg:hidden" aria-label="Menu">
              ☰
            </button>
            <p className="hidden text-sm text-ink/55 sm:block">{t.brand}</p>
          </div>
          <div className="flex items-center gap-2">
            <AdminLangSwitch />
            <ThemeToggle labels={{ light: "Light", dark: "Dark" }} className="!h-9 !w-9 !rounded-lg" />
            {me && (
              <div className="hidden text-end text-xs leading-tight sm:block">
                <p className="font-semibold">{me.name}</p>
                <p className="text-ink/50">
                  {t.roles[me.role]}
                  {dealerName ? ` · ${dealerName}` : ""}
                </p>
              </div>
            )}
          </div>
        </header>
        <main className="mx-auto max-w-[1400px] px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
