"use client";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

export type CurrencyInfo = { code: string; symbol: string; rate: number; decimals: number };

type Ctx = { code: string; list: CurrencyInfo[]; set: (code: string) => void; approx: (pkr: number) => string | null };
const CurrencyCtx = createContext<Ctx>({ code: "PKR", list: [], set: () => {}, approx: () => null });

/** Prices are always charged and invoiced in PKR. Another currency is only shown as a guide next to the PKR figure. */
export default function CurrencyProvider({ list, initial, children }: { list: CurrencyInfo[]; initial: string; children: React.ReactNode }) {
  const others = useMemo(() => list.filter((c) => c.code !== "PKR"), [list]);
  const [code, setCode] = useState(others.some((c) => c.code === initial) ? initial : "PKR");
  const set = useCallback((c: string) => {
    const next = c === "PKR" || others.some((o) => o.code === c) ? c : "PKR";
    setCode(next);
    try {
      document.cookie = `zx-cur=${next}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      /* cookies blocked: the choice only lasts for this visit */
    }
  }, [others]);
  const approx = useCallback(
    (pkr: number) => {
      const c = others.find((o) => o.code === code);
      if (!c) return null;
      const v = new Intl.NumberFormat("en-US", { minimumFractionDigits: c.decimals, maximumFractionDigits: c.decimals }).format(pkr * c.rate);
      return `${c.symbol === c.code ? c.code + " " : c.symbol}${v}`;
    },
    [others, code],
  );
  const value = useMemo(() => ({ code, list: others, set, approx }), [code, others, set, approx]);
  return <CurrencyCtx.Provider value={value}>{children}</CurrencyCtx.Provider>;
}

export const useCurrency = () => useContext(CurrencyCtx);

/** "≈ $650.00" in the chosen currency; nothing at all while PKR is selected. */
export function Approx({ pkr, className = "" }: { pkr: number; className?: string }) {
  const { approx } = useCurrency();
  const s = approx(pkr);
  if (!s) return null;
  return (
    <span dir="ltr" className={`latin whitespace-nowrap text-[0.8em] font-normal opacity-70 ${className}`} title="Approximate. Charged in PKR.">
      ≈ {s}
    </span>
  );
}

export function CurrencySwitch({ tone = "white" }: { tone?: "white" | "dark" }) {
  const { code, list, set } = useCurrency();
  if (!list.length) return null;
  return (
    <select
      aria-label="Currency"
      value={code}
      onChange={(e) => set(e.target.value)}
      className={`h-9 rounded-md border bg-transparent px-1.5 text-[12px] font-semibold outline-none ${tone === "white" ? "border-white/25 text-white" : "border-ink/20 text-ink"}`}
    >
      <option value="PKR" className="text-black">PKR</option>
      {list.map((c) => (
        <option key={c.code} value={c.code} className="text-black">
          {c.code}
        </option>
      ))}
    </select>
  );
}
