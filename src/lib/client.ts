"use client";
import type { SiteDict } from "@/i18n/site";
import { fill } from "./format";
import type { Config } from "./types";

export type ApiResult<T = Record<string, unknown>> = ({ ok: true } & T) | { ok: false; error: string; n?: number };

export async function api<T = Record<string, unknown>>(url: string, body?: unknown, method = "POST"): Promise<ApiResult<T>> {
  try {
    const r = await fetch(url, { method, headers: body === undefined ? undefined : { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const j = await r.json().catch(() => ({ ok: false, error: "server" }));
    return j as ApiResult<T>;
  } catch {
    return { ok: false, error: "network" };
  }
}

/** Error code → message in the visitor's language (never a raw code, never Chinese). */
export function errorText(t: { errors: SiteDict["errors"] }, code: string, vars: Record<string, string | number> = {}) {
  const msg = (t.errors as Record<string, string>)[code] ?? t.errors.server;
  return fill(msg, vars);
}

/* ── things kept on this device for guests ── */
const QKEY = "zx-quotes";
const SKEY = "zx-setups";
export type DeviceSetup = { id: string; model: string; modelName: string; config: Config; label: string; total: number; at: string };

const read = <T,>(k: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
};
const write = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};

export const deviceQuoteIds = () => read<string[]>(QKEY, []);
export const rememberQuote = (id: string) => write(QKEY, [id, ...deviceQuoteIds().filter((x) => x !== id)].slice(0, 50));
export const forgetDeviceQuotes = () => write(QKEY, []);
export const deviceSetups = () => read<DeviceSetup[]>(SKEY, []);
export const saveDeviceSetup = (s: DeviceSetup) => write(SKEY, [s, ...deviceSetups()].slice(0, 20));
export const removeDeviceSetup = (id: string) => write(SKEY, deviceSetups().filter((s) => s.id !== id));

/** Config ⇄ query string, so a build survives refresh and can be shared. */
export const configToQuery = (c: Config) => new URLSearchParams(Object.entries(c).filter(([, v]) => !!v) as [string, string][]).toString();
