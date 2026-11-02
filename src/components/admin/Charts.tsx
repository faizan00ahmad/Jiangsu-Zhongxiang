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

/** Area/line chart with a hover read-out. Values are plain numbers; `format` shapes the tooltip. */
export function LineChart({ points, prefix = "", color = "var(--volt)", empty }: { points: { label: string; value: number }[]; prefix?: string; color?: string; empty: string }) {
  const format = (v: number) => `${prefix}${v.toLocaleString("en-US")}`;
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...points.map((p) => p.value));
  if (!points.length || !points.some((p) => p.value > 0)) return <p className="py-10 text-center text-sm text-ink/45">{empty}</p>;
  const W = 600;
  const H = 170;
  const pad = 6;
  const x = (i: number) => pad + (points.length === 1 ? 0 : (i / (points.length - 1)) * (W - pad * 2));
  const y = (v: number) => H - pad - (v / max) * (H - pad * 2 - 14);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)},${H - pad} L${x(0).toFixed(1)},${H - pad} Z`;
  const gid = `lg${color.replace(/\W/g, "")}`;
  return (
    <div className="relative" onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-44 w-full" role="img" aria-label="chart" onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setHover(Math.max(0, Math.min(points.length - 1, Math.round(((e.clientX - r.left) / r.width) * (points.length - 1)))));
      }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.35" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((t) => (
          <line key={t} x1={pad} x2={W - pad} y1={H - pad - t * (H - pad * 2 - 14)} y2={H - pad - t * (H - pad * 2 - 14)} stroke="currentColor" strokeOpacity="0.08" />
        ))}
        <path d={area} fill={`url(#${gid})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
        {hover !== null && (
          <>
            <line x1={x(hover)} x2={x(hover)} y1={0} y2={H - pad} stroke="currentColor" strokeOpacity="0.2" />
            <circle cx={x(hover)} cy={y(points[hover].value)} r="4" fill={color} />
          </>
        )}
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-ink/45">
        <span>{points[0].label}</span>
        <span>{points[points.length - 1].label}</span>
      </div>
      {hover !== null && (
        <div role="tooltip" className="pointer-events-none absolute -top-1 start-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-ink/15 bg-card px-2.5 py-1 text-xs shadow-lg">
          {points[hover].label} · <b className="tabular-nums">{format(points[hover].value)}</b>
        </div>
      )}
    </div>
  );
}

/** Stepped funnel: each bar is a share of the first step. */
export function Funnel({ steps, empty }: { steps: { label: string; value: number }[]; empty: string }) {
  const top = Math.max(1, steps[0]?.value ?? 0);
  if (!steps[0]?.value) return <p className="py-6 text-center text-sm text-ink/45">{empty}</p>;
  return (
    <ol className="space-y-2">
      {steps.map((s, i) => (
        <li key={s.label}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-ink/75">{s.label}</span>
            <span className="tabular-nums">
              <b>{s.value}</b>
              {i > 0 && <span className="ms-2 text-xs text-ink/45">{Math.round((s.value / top) * 100)}%</span>}
            </span>
          </div>
          <div className="h-7 rounded-lg bg-ink/[0.06]">
            <motion.div className="h-7 rounded-lg" style={{ background: ["#3d8bff", "#2ee6a6", "#f5b40c", "#a78bfa"][i % 4] }} initial={{ width: 0 }} animate={{ width: `${Math.max(2, (s.value / top) * 100)}%` }} transition={{ duration: 0.8, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }} />
          </div>
        </li>
      ))}
    </ol>
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
