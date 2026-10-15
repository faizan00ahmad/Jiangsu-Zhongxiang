"use client";
import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { CITIES, CITY_ORDER } from "@/lib/catalog";
import { api, deviceQuoteIds, errorText } from "@/lib/client";
import type { CityKey } from "@/lib/types";
import Logo from "@/components/Logo";
import { Button, Notice } from "@/components/ui";

/** Login and sign-up. Quotations generated as a guest on this device move into the account automatically. */
export default function AuthForm({ mode, next }: { mode: "login" | "register"; next: string }) {
  const { t, tx } = useI18n();
  const [f, setF] = useState({ name: "", phone: "", password: "", email: "", city: "lahore" as CityKey });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const reg = mode === "register";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (reg && f.password.length < 8) return setErr(t.errors.weak_password);
    setBusy(true);
    const r = await api(reg ? "/api/auth/register" : "/api/auth/login", { ...f, claim: deviceQuoteIds() });
    if (!r.ok) {
      setBusy(false);
      return setErr(errorText(t, r.error));
    }
    // full navigation so the header and every server component pick up the session
    window.location.assign(next);
  }

  return (
    <div className="relative isolate flex min-h-[100svh] items-center justify-center px-5 pb-16 pt-32">
      <div className="aurora -z-10">
        <i />
        <i />
        <i />
      </div>
      <div className="grid-bg absolute inset-0 -z-10 opacity-50" />
      <form onSubmit={submit} className="glass w-full max-w-md rounded-[2rem] p-7 md:p-9">
        <Logo size="lg" wordmark={false} />
        <h1 className="font-display mt-5 text-3xl font-semibold">{reg ? t.auth.registerTitle : t.auth.loginTitle}</h1>
        <p className="mt-1 text-ink/60">{reg ? t.auth.registerText : t.auth.loginText}</p>
        <div className="mt-7 space-y-4">
          {reg && (
            <label className="block">
              <span className="mb-1.5 block text-sm text-ink/70">{t.auth.name}</span>
              <input className="field" value={f.name} onChange={set("name")} autoComplete="name" required maxLength={80} />
            </label>
          )}
          <label className="block">
            <span className="mb-1.5 block text-sm text-ink/70">{t.auth.phone}</span>
            <input className="field latin" dir="ltr" inputMode="tel" value={f.phone} onChange={set("phone")} placeholder="03XX XXXXXXX" autoComplete="tel" required maxLength={16} />
          </label>
          <label className="block">
            <span className="mb-1.5 flex justify-between text-sm text-ink/70">
              {t.auth.password}
              {reg && <span className="text-xs text-ink/45">{t.auth.passwordHint}</span>}
            </span>
            <input className="field" type="password" value={f.password} onChange={set("password")} autoComplete={reg ? "new-password" : "current-password"} required minLength={reg ? 8 : 1} maxLength={200} />
          </label>
          {reg && (
            <>
              <label className="block">
                <span className="mb-1.5 block text-sm text-ink/70">
                  {t.auth.email} <span className="text-xs text-ink/45">({t.common.optional})</span>
                </span>
                <input className="field latin" dir="ltr" type="email" value={f.email} onChange={set("email")} autoComplete="email" maxLength={120} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm text-ink/70">{t.auth.city}</span>
                <select className="field" value={f.city} onChange={set("city")}>
                  {CITY_ORDER.map((c) => (
                    <option key={c} value={c}>
                      {tx(CITIES[c])}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
        </div>
        {err && (
          <Notice tone="error" className="mt-5">
            {err}
          </Notice>
        )}
        <Button type="submit" disabled={busy} magnetic={false} className="mt-6 w-full">
          {busy ? t.auth.working : reg ? t.auth.register : t.auth.login}
        </Button>
        <p className="mt-5 text-center text-sm text-ink/60">
          {reg ? t.auth.haveAccount : t.auth.noAccount}{" "}
          <Link href={`/${reg ? "login" : "register"}?next=${encodeURIComponent(next)}`} className="font-semibold text-[var(--volt)] hover:underline">
            {reg ? t.auth.login : t.auth.register}
          </Link>
        </p>
      </form>
    </div>
  );
}
