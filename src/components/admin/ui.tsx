"use client";
import { motion } from "framer-motion";

export function Card({ title, sub, actions, children, className = "" }: { title?: React.ReactNode; sub?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-ink/10 bg-card/70 ${className}`}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-ink/10 px-5 py-4">
          <div>
            {title && <h2 className="font-semibold">{title}</h2>}
            {sub && <p className="mt-0.5 text-xs text-ink/50">{sub}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function PageTitle({ title, intro, actions }: { title: string; intro?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold tracking-tight md:text-3xl">
          {title}
        </motion.h1>
        {intro && <p className="mt-1 max-w-3xl text-sm text-ink/55">{intro}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Field({ label, children, hint, className = "" }: { label: string; children: React.ReactNode; hint?: string; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-ink/60">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-ink/40">{hint}</span>}
    </label>
  );
}

export const inputCls = "w-full rounded-lg border border-ink/12 bg-field px-3 py-2 text-sm text-ink outline-none transition focus:border-[var(--volt)] focus:ring-2 focus:ring-[var(--volt)]/20";

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className="inline-flex items-center gap-2 text-sm">
      <span className={`relative h-6 w-11 rounded-full transition-colors ${on ? "bg-[var(--volt)]" : "bg-ink/20"}`}>
        <motion.span layout transition={{ type: "spring", stiffness: 500, damping: 30 }} className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow ${on ? "end-0.5" : "start-0.5"}`} />
      </span>
      {label && <span className="text-ink/70">{label}</span>}
    </button>
  );
}

export function Btn({ children, tone = "default", className = "", ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "default" | "primary" | "danger" | "ghost" }) {
  const c = {
    default: "border border-ink/15 bg-ink/[0.04] hover:bg-ink/10",
    primary: "bg-[var(--volt)] font-semibold text-black hover:brightness-110",
    danger: "bg-red-500/90 font-semibold text-white hover:bg-red-500",
    ghost: "text-ink/60 hover:bg-ink/10 hover:text-ink",
  }[tone];
  return (
    <button {...rest} className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${c} ${className}`}>
      {children}
    </button>
  );
}

export function Pill({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: `${color}1f`, color }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {children}
    </span>
  );
}

export const STATUS_COLOR = { pending_payment: "#f5b40c", active: "#2ee6a6", completed: "#3d8bff", cancelled: "#8b93a3", expired: "#ff4d3d" } as const;
export const STOCK_COLOR = { in: "#2ee6a6", low: "#f5b40c", out: "#ff4d3d" } as const;
