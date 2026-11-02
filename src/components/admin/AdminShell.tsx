"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { GROUPS, MODULES, type ModuleKey } from "@/lib/perms";
import { api } from "@/lib/client";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { Globe, Logout } from "@/components/Icons";
import { useAdmin } from "./AdminProvider";
import AdminLangSwitch from "./AdminLangSwitch";
import Modal from "./kit/Modal";
import { inputCls } from "./ui";

export type Alerts = Partial<Record<ModuleKey, number>>;

const hrefOf = (m: (typeof MODULES)[number]) => `/admin${m.href}`;

/** Grouped sidebar from the permission table, Ctrl+K jump box, alert bell and account menu. */
export default function AdminShell({ children, dealerName, alerts }: { children: React.ReactNode; dealerName: string | null; alerts: Alerts }) {
  const { t, k, me, can } = useAdmin();
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [bell, setBell] = useState(false);
  const [jump, setJump] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const bellRef = useRef<HTMLDivElement>(null);

  const allowed = MODULES.filter((m) => can(`${m.key}.view`));
  const grouped = GROUPS.map((g) => ({ g, items: allowed.filter((m) => m.group === g) })).filter((x) => x.items.length);
  const active = (m: (typeof MODULES)[number]) => (m.href === "" ? path === "/admin" : path === hrefOf(m) || path.startsWith(`${hrefOf(m)}/`));
  const alertList = (Object.entries(alerts) as [ModuleKey, number][]).filter(([key, n]) => n > 0 && can(`${key}.view`));
  const total = alertList.reduce((s, [, n]) => s + n, 0);
  const needle = q.trim().toLowerCase();
  const hits = allowed.filter((m) => !needle || k.modules[m.key].toLowerCase().includes(needle) || m.key.includes(needle));

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setJump(true);
        setQ("");
        setSel(0);
      }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);
  useEffect(() => {
    if (!bell) return;
    const off = (e: MouseEvent) => !bellRef.current?.contains(e.target as Node) && setBell(false);
    document.addEventListener("mousedown", off);
    return () => document.removeEventListener("mousedown", off);
  }, [bell]);

  const go = (href: string) => {
    setJump(false);
    setBell(false);
    setOpen(false);
    router.push(href);
  };

  const side = (
    <nav className="flex h-full flex-col p-3" aria-label="Admin">
      <Link href="/admin" className="mb-3 px-2 pt-2" onClick={() => setOpen(false)}>
        <Logo size="nav" />
      </Link>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pe-1" data-lenis-prevent>
        {grouped.map(({ g, items }) => (
          <div key={g}>
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/35">{k.groups[g]}</p>
            {items.map((m) => (
              <Link key={m.key} href={hrefOf(m)} onClick={() => setOpen(false)} aria-current={active(m) ? "page" : undefined} className={`relative flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${active(m) ? "text-ink" : "text-ink/60 hover:bg-ink/[0.06] hover:text-ink"}`}>
                {active(m) && <motion.span layoutId="adm-nav" className="absolute inset-0 rounded-xl bg-ink/10" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
                <span className="relative flex-1 truncate">{k.modules[m.key]}</span>
                {!!alerts[m.key] && <span className="relative rounded-full bg-[var(--amber)] px-1.5 text-[11px] font-bold text-black">{alerts[m.key]}</span>}
              </Link>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 space-y-1 border-t border-ink/10 pt-3">
        <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-ink/60 hover:bg-ink/[0.06] hover:text-ink">
          <Globe size={16} /> {t.nav.site}
        </a>
        <button
          onClick={async () => {
            await api("/api/admin/logout", {});
            router.replace("/admin/login");
            router.refresh();
          }}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-ink/60 hover:bg-ink/[0.06] hover:text-ink"
        >
          <Logout size={16} /> {t.nav.logout}
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="sticky top-0 hidden h-screen border-e border-ink/10 bg-card/60 lg:block">{side}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <aside className="relative h-full w-72 max-w-[85vw] bg-card" onClick={(e) => e.stopPropagation()}>
            {side}
          </aside>
        </div>
      )}
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-ink/10 bg-bg/80 px-4 py-3 backdrop-blur-xl md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => setOpen(true)} className="grid h-9 w-9 place-items-center rounded-lg border border-ink/15 lg:hidden" aria-label={k.shell.menu}>
              ☰
            </button>
            <button onClick={() => (setJump(true), setQ(""), setSel(0))} className="hidden h-9 min-w-[15rem] items-center justify-between gap-3 rounded-lg border border-ink/12 bg-field px-3 text-sm text-ink/45 hover:border-ink/25 md:flex">
              <span>{k.shell.search}</span>
              <kbd className="rounded border border-ink/15 px-1.5 text-[10px]">{k.shell.searchHint}</kbd>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative" ref={bellRef}>
              <button onClick={() => setBell((v) => !v)} aria-label={k.shell.notifications} aria-expanded={bell} className="relative grid h-9 w-9 place-items-center rounded-lg border border-ink/15 hover:bg-ink/10">
                🔔
                {total > 0 && <span className="absolute -end-1 -top-1 grid min-w-[18px] place-items-center rounded-full bg-[var(--amber)] px-1 text-[10px] font-bold text-black">{total > 99 ? "99+" : total}</span>}
              </button>
              {bell && (
                <div className="absolute end-0 top-full z-40 mt-2 w-72 rounded-xl border border-ink/12 bg-card p-2 shadow-2xl">
                  {alertList.length === 0 && <p className="px-3 py-4 text-center text-sm text-ink/50">{k.shell.none}</p>}
                  {alertList.map(([key, n]) => (
                    <button key={key} onClick={() => go(`/admin${MODULES.find((m) => m.key === key)!.href}`)} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-ink/[0.06]">
                      <span>{key === "orders" ? k.dash.todoVerify : key === "reviews" ? k.dash.todoReviews : key === "enquiries" ? k.dash.todoEnquiries : key === "chat" ? k.dash.todoChats : k.dash.todoStock}</span>
                      <span className="rounded-full bg-[var(--amber)] px-2 text-xs font-bold text-black">{n}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <AdminLangSwitch />
            <ThemeToggle labels={{ light: "Light", dark: "Dark" }} className="!h-9 !w-9 !rounded-lg" />
            {me && (
              <Link href="/admin/profile" className="hidden text-end text-xs leading-tight hover:opacity-80 sm:block" title={k.shell.profile}>
                <p className="font-semibold">{me.name}</p>
                <p className="text-ink/50">
                  {me.roleName}
                  {dealerName ? ` · ${dealerName}` : ""}
                </p>
              </Link>
            )}
          </div>
        </header>
        <main className="mx-auto max-w-[1400px] px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>

      <Modal open={jump} onClose={() => setJump(false)} title={k.shell.search}>
        <input
          autoFocus
          className={inputCls}
          value={q}
          onChange={(e) => (setQ(e.target.value), setSel(0))}
          placeholder={k.shell.search}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") (e.preventDefault(), setSel((s) => Math.min(hits.length - 1, s + 1)));
            if (e.key === "ArrowUp") (e.preventDefault(), setSel((s) => Math.max(0, s - 1)));
            if (e.key === "Enter" && hits[sel]) go(hrefOf(hits[sel]));
          }}
        />
        <ul className="mt-3 max-h-72 overflow-y-auto" data-lenis-prevent>
          {hits.map((m, i) => (
            <li key={m.key}>
              <button onClick={() => go(hrefOf(m))} onMouseEnter={() => setSel(i)} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm ${i === sel ? "bg-ink/10" : ""}`}>
                <span>{k.modules[m.key]}</span>
                <span className="text-xs text-ink/40">{k.groups[m.group]}</span>
              </button>
            </li>
          ))}
          {!hits.length && <li className="px-3 py-6 text-center text-sm text-ink/50">{k.table.empty}</li>}
        </ul>
      </Modal>
    </div>
  );
}
