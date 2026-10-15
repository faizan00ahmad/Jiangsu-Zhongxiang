import type { Lang } from "./types";

/** Fixed locale + time zone so server and browser render identical strings. */
const num = new Intl.NumberFormat("en-US");
export const n = (v: number) => num.format(v);

export const pkr = (v: number, lang: Lang = "en") => (lang === "ur" ? `${num.format(v)} روپے` : `PKR ${num.format(v)}`);
export const signedPkr = (v: number, lang: Lang = "en") => (v === 0 ? (lang === "ur" ? "شامل" : "Included") : `+ ${pkr(v, lang)}`);

const TZ = "Asia/Karachi";
const dFmt = { en: new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: TZ }), zh: new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: TZ }) };
const dtFmt = { en: new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ }), zh: new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ }) };

/** Urdu text keeps Latin digits/month names — the common usage on Pakistani sites and receipts. */
export const date = (iso: string | null | undefined, l: "en" | "ur" | "zh" = "en") => (iso ? dFmt[l === "zh" ? "zh" : "en"].format(new Date(iso)) : "—");
export const dateTime = (iso: string | null | undefined, l: "en" | "ur" | "zh" = "en") => (iso ? dtFmt[l === "zh" ? "zh" : "en"].format(new Date(iso)) : "—");

export const daysBetween = (a: string, b: string) => Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));

/** "{n} days" style interpolation for dictionary strings. */
export const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
