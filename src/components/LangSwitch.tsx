"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { Globe } from "./Icons";

/** One-click English ⇄ Urdu. The choice is kept in a session cookie: it holds while the visitor browses, and every new
 *  visit (browser reopened) starts in English. To remember it for a year instead, add `max-age=31536000` below. */
export default function LangSwitch({ className = "", tone = "ink" }: { className?: string; tone?: "ink" | "white" }) {
  const { lang, t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const next = lang === "en" ? "ur" : "en";
  return (
    <button
      type="button"
      onClick={() => {
        document.cookie = `zx_lang=${next}; path=/; samesite=lax`;
        document.documentElement.lang = next === "ur" ? "ur-PK" : "en";
        document.documentElement.dir = next === "ur" ? "rtl" : "ltr";
        start(() => router.refresh());
      }}
      aria-label={t.nav.switchLabel}
      data-magnetic
      className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-semibold transition-colors ${tone === "white" ? "border-white/25 text-white hover:bg-white/10" : "border-ink/15 text-ink hover:bg-ink/5"} ${pending ? "opacity-60" : ""} ${className}`}
    >
      <Globe size={16} />
      <span lang={next === "ur" ? "ur" : "en"} className={next === "ur" ? "font-[family-name:var(--font-urdu)] text-[15px] leading-none" : "latin"}>
        {t.nav.switchTo}
      </span>
    </button>
  );
}
