import { useId } from "react";

/** ZX monogram: a lightning-cut "Z" in a rounded tile, plus the Latin wordmark (brand marks stay Latin in Urdu too). */
export default function Logo({ size = "nav", className = "", wordmark = true, tone = "ink" }: { size?: "nav" | "lg" | "xl"; className?: string; wordmark?: boolean; tone?: "ink" | "white" }) {
  const id = useId().replace(/:/g, "");
  const box = size === "xl" ? 76 : size === "lg" ? 46 : 36;
  return (
    <span dir="ltr" className={`logo-glow inline-flex items-center gap-3 ${className}`}>
      <svg width={box} height={box} viewBox="0 0 48 48" aria-hidden>
        <defs>
          <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#2ee6a6" />
            <stop offset="1" stopColor="#3d8bff" />
          </linearGradient>
        </defs>
        <rect x="1" y="1" width="46" height="46" rx="13" fill={`url(#g${id})`} />
        <path d="M13 14h22l-12.5 11H31L17.5 37 21 27h-8l11-9H13z" fill="#05070a" />
      </svg>
      {wordmark && (
        <span className="flex flex-col leading-none">
          <span className={`latin-d font-extrabold tracking-[0.14em] ${tone === "white" ? "text-white" : "text-ink"} ${size === "xl" ? "text-3xl" : size === "lg" ? "text-xl" : "text-[15px]"}`}>EVOLTA BIKES</span>
          <span className={`latin mt-1 font-semibold tracking-[0.42em] ${tone === "white" ? "text-white/55" : "text-ink/55"} ${size === "xl" ? "text-xs" : "text-[9px]"}`}>ZHONGXIANG</span>
        </span>
      )}
    </span>
  );
}
