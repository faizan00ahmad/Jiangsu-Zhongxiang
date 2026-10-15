"use client";
import { useState } from "react";
import { motion } from "framer-motion";

/** Single-series horizontal bars: one hue, value labels in ink, hover tooltip, table-like reading order. */
export function BarList({ rows, unit = "", color = "var(--volt)", empty }: { rows: { label: string; value: number; sub?: string }[]; unit?: string; color?: string; empty: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...rows.map((r) => r.value));
  const total = rows.reduce((s, r) => s + r.value, 0);
  if (!total) return <p className="py-6 text-center text-sm text-ink/45">{empty}</p>;
  return (
    <ul className="space-y-2.5" role="list">
      {rows.map((r, i) => (
        <li key={r.label} className="relative" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-ink/80">{r.label}</span>
            <span className="shrink-0 tabular-nums font-semibold text-ink">
              {r.value}
              {unit && <span className="ms-0.5 text-xs font-normal text-ink/50">{unit}</span>}
            </span>
          </div>
          <div className="h-2 rounded-full bg-ink/[0.07]">
            <motion.div className="h-2 rounded-full" style={{ background: color, opacity: hover === null || hover === i ? 1 : 0.45 }} initial={{ width: 0 }} animate={{ width: `${(r.value / max) * 100}%` }} transition={{ duration: 0.9, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }} />
          </div>
          {hover === i && (
            <div role="tooltip" className="pointer-events-none absolute -top-9 end-0 z-10 whitespace-nowrap rounded-lg border border-ink/15 bg-card px-2.5 py-1 text-xs shadow-lg">
              <b className="tabular-nums">{r.value}</b> · {Math.round((r.value / total) * 100)}%{r.sub ? ` · ${r.sub}` : ""}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export function Stat({ label, value, sub, tone = "var(--volt)" }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-ink/10 bg-card/70 p-5">
      <span className="absolute inset-y-0 start-0 w-1" style={{ background: tone }} />
      <p className="text-xs text-ink/55">{label}</p>
      <p className="font-display mt-1.5 text-2xl font-bold tabular-nums md:text-3xl">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ink/45">{sub}</p>}
    </div>
  );
}
