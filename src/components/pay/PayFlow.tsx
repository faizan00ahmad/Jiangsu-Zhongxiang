"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import { api, errorText } from "@/lib/client";
import { dateTime, fill, pkr } from "@/lib/format";
import type { PayMethod } from "@/lib/types";
import type { intentView } from "@/lib/server/payments";
import { Notice } from "@/components/ui";
import { Lock } from "@/components/Icons";
import CheckoutSteps from "./CheckoutSteps";
import MethodPicker from "./MethodPicker";

export type PayView = ReturnType<typeof intentView>;
type Res = { ok: boolean; error?: string; view?: PayView | null };

const inputCls = "field latin";

/** Demo values for the sandbox pages. Never shown once a live gateway is connected. */
const yy = String(new Date().getFullYear() + 3).slice(2);
const DEMO_CARDS = { visa: "4242 4242 4242 4242", mastercard: "5555 5555 5555 4444", paypak: "2205 0000 0000 0009", declined: "4000 0000 0000 0002", noFunds: "4000 0000 0000 9995" } as const;
const DEMO_WALLETS = { wallet: "0300 1234567", walletEmpty: "0300 1230000", walletOff: "0300 1239999" } as const;

/** A tiny valid PNG made in the browser, so a demo bank transfer needs no file on the computer. */
function demoReceipt(): Promise<File | null> {
  const c = document.createElement("canvas");
  c.width = 480;
  c.height = 220;
  const g = c.getContext("2d");
  if (!g) return Promise.resolve(null);
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = "#111111";
  g.font = "bold 22px sans-serif";
  g.fillText("DEMO TRANSFER RECEIPT", 24, 50);
  g.font = "16px sans-serif";
  g.fillText("Sandbox only. Not a real payment.", 24, 90);
  g.fillText(new Date().toISOString().slice(0, 16).replace("T", " "), 24, 130);
  return new Promise((res) => c.toBlob((b) => res(b ? new File([b], "demo-receipt.png", { type: "image/png" }) : null), "image/png"));
}
const spaced = (v: string) => v.replace(/\D/g, "").slice(0, 19).replace(/(.{4})/g, "$1 ").trim();
const expiryFmt = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

/** One payment attempt, step by step: wallet number → approve → done; card → 3-D Secure → done; bank details → receipt → under review.
 *  Every screen is drawn from the server's answer, so a refresh or a second tab always shows the truth. */
export default function PayFlow({ initial, methods, lockUntil }: { initial: PayView; methods: PayMethod[]; lockUntil: string | null }) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [view, setView] = useState<PayView>(initial);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false); // changing the number or card after the first step
  const [wallet, setWallet] = useState("");
  const [card, setCard] = useState({ number: "", expiry: "", cvv: "", name: "" });
  const [otp, setOtp] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [retry, setRetry] = useState<PayMethod | "">("");
  const fileRef = useRef<HTMLInputElement>(null);

  const apply = useCallback((r: Res) => {
    if (r.view) setView(r.view);
    setErr(r.ok ? "" : errorText(t, r.error ?? "server"));
    return r.ok;
  }, [t]);

  const refresh = useCallback(async () => {
    const r = await api<{ view: PayView }>(`/api/pay/${initial.id}`, undefined, "GET");
    if (r.ok) setView(r.view);
  }, [initial.id]);

  // the clock for the approval window, and a gentle check while a bank transfer is being reviewed
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (view.status !== "review") return;
    const id = setInterval(() => void refresh(), 20000);
    return () => clearInterval(id);
  }, [view.status, refresh]);
  const left = view.approveUntil ? Math.max(0, Math.round((Date.parse(view.approveUntil) - now) / 1000)) : 0;
  useEffect(() => {
    if (!(view.step === "approve" && view.status === "awaiting" && view.approveUntil && left === 0)) return;
    const id = setTimeout(() => void refresh(), 0); // the window ran out: the server decides
    return () => clearTimeout(id);
  }, [left, view.step, view.status, view.approveUntil, refresh]);

  async function step(path: string, body: unknown) {
    setBusy(true);
    const r = (await api<{ view: PayView }>(`/api/pay/${view.id}/${path}`, body)) as Res;
    setBusy(false);
    return apply(r);
  }
  async function sendWallet(e: React.FormEvent) {
    e.preventDefault();
    if (await step("wallet", { number: wallet })) {
      setEditing(false);
      setOtp("");
    }
  }
  async function sendCard(e: React.FormEvent) {
    e.preventDefault();
    if (await step("card", card)) {
      setEditing(false);
      setOtp("");
      setCard((c) => ({ ...c, number: "", cvv: "" })); // nothing sensitive stays in the page
    }
  }
  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (await step("otp", { code: otp })) router.refresh();
    setOtp("");
  }
  async function sendReceipt(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return setErr(errorText(t, "bad_file"));
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/pay/${view.id}/receipt`, { method: "POST", body: fd })
      .then((r) => r.json() as Promise<Res>)
      .catch(() => ({ ok: false, error: "network" }) as Res);
    setBusy(false);
    apply(res);
  }
  async function cancel() {
    await step("cancel", {});
  }
  async function tryAgain() {
    if (!retry) return;
    setBusy(true);
    const r = await api<{ id: string }>("/api/pay/start", { groupId: view.groupId, orderId: view.orders[0]?.id, method: retry, mode: view.mode });
    setBusy(false);
    if (!r.ok) return setErr(errorText(t, r.error));
    router.push(`/pay/${r.id}`);
  }

  const done = view.status === "succeeded";
  const open = view.status === "created" || view.status === "awaiting";
  const wal = view.method === "jazzcash" || view.method === "easypaisa";
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  const names = view.orders.map((o) => o.id).join(", ");
  const sandboxTxt = wal ? t.pay.test.wallet : view.method === "card" ? t.pay.test.card : "";

  return (
    <div className="px-5 pb-24">
      <CheckoutSteps at={done || view.status === "review" ? 3 : 2} />
      <div className="mx-auto max-w-2xl space-y-6">
        {view.sandbox && open && <p className="rounded-2xl bg-[#fff7e6] px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-[#8a5a00]">{t.pay.sandbox}</p>}

        <header className="glass rounded-3xl p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-ink/50">{t.pay.amount}</p>
              <p className="font-display text-3xl font-bold">{pkr(view.amount, lang)}</p>
            </div>
            <div className="text-end text-sm">
              <p className="text-ink/55">{t.pay.ref}</p>
              <p className="latin font-mono font-semibold">{view.ref}</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-ink/60">
            {t.pay.forOrders} <span className="latin">{names}</span> · {t.pay.methods[view.method]}
          </p>
        </header>

        {err && <Notice tone="error">{err}</Notice>}

        {done && (
          <section className="glass rounded-3xl p-6 text-center">
            <p className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--accent)] text-2xl text-black">✓</p>
            <h2 className="font-display mt-4 text-2xl font-semibold">{t.pay.result.okTitle}</h2>
            <p className="mx-auto mt-2 max-w-md text-ink/65">{t.pay.result.okText}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {view.orders.length === 1 ? (
                <Link href={`/orders/${view.orders[0].id}`} className="inline-flex h-12 items-center rounded-full bg-[#111] px-6 text-sm font-semibold text-white">{t.pay.result.store}</Link>
              ) : (
                <Link href="/orders" className="inline-flex h-12 items-center rounded-full bg-[#111] px-6 text-sm font-semibold text-white">{t.pay.result.orders}</Link>
              )}
              <Link href={`/receipt/${view.id}`} className="inline-flex h-12 items-center rounded-full border border-ink/20 px-6 text-sm font-semibold hover:bg-ink/10">{t.pay.result.receipt}</Link>
            </div>
          </section>
        )}

        {view.status === "review" && (
          <section className="glass rounded-3xl p-6 text-center">
            <p className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#3d8bff] text-2xl text-white">⏳</p>
            <h2 className="font-display mt-4 text-2xl font-semibold">{t.pay.result.reviewTitle}</h2>
            <p className="mx-auto mt-2 max-w-md text-ink/65">{t.pay.result.reviewText}</p>
            <Link href="/orders" className="mt-6 inline-flex h-12 items-center rounded-full bg-[#111] px-6 text-sm font-semibold text-white">{t.pay.result.orders}</Link>
          </section>
        )}

        {(view.status === "failed" || view.status === "cancelled" || view.status === "expired") && (
          <section className="glass rounded-3xl p-6">
            <h2 className="font-display text-2xl font-semibold">{view.status === "expired" ? t.pay.result.expiredTitle : view.status === "cancelled" ? t.pay.result.cancelledTitle : t.pay.result.failTitle}</h2>
            {view.reviewNote && <p className="mt-2 text-sm text-ink/70">{view.reviewNote}</p>}
            {lockUntil && <p className="mt-2 text-ink/65">{fill(t.pay.result.failText, { date: dateTime(lockUntil, lang) })}</p>}
            {lockUntil ? (
              <div className="mt-5 space-y-4">
                <p className="text-sm font-semibold">{t.pay.result.retry}</p>
                <MethodPicker methods={methods} value={retry} onChange={setRetry} />
                <button type="button" onClick={tryAgain} disabled={!retry || busy} className="inline-flex h-12 items-center rounded-full bg-[#111] px-7 text-sm font-semibold text-white disabled:opacity-50">
                  {t.pay.again}
                </button>
              </div>
            ) : (
              <Link href="/orders" className="mt-5 inline-flex h-12 items-center rounded-full bg-[#111] px-6 text-sm font-semibold text-white">{t.pay.result.orders}</Link>
            )}
          </section>
        )}

        {open && wal && (view.step === "details" || editing) && (
          <form onSubmit={sendWallet} noValidate className="glass space-y-4 rounded-3xl p-6">
            <h2 className="font-display text-xl font-semibold">{fill(t.pay.wallet.title, { name: t.pay.methods[view.method] })}</h2>
            <p className="text-sm text-ink/65">{fill(t.pay.wallet.text, { name: t.pay.methods[view.method] })}</p>
            <label className="block">
              <span className="mb-1.5 block text-sm text-ink/70">{fill(t.pay.wallet.number, { name: t.pay.methods[view.method] })}</span>
              <input className={inputCls} dir="ltr" inputMode="tel" autoComplete="off" maxLength={16} value={wallet} onChange={(e) => setWallet(e.target.value)} placeholder={t.checkout.phoneHint} />
            </label>
            <button type="submit" disabled={busy} className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#111] text-sm font-semibold text-white disabled:opacity-60">{t.pay.wallet.send}</button>
          </form>
        )}

        {open && wal && view.step === "approve" && !editing && (
          <form onSubmit={sendOtp} noValidate className="glass space-y-4 rounded-3xl p-6">
            <h2 className="font-display text-xl font-semibold">{t.pay.wallet.approveTitle}</h2>
            <p className="text-sm text-ink/65">{fill(t.pay.wallet.approveText, { amount: pkr(view.amount, lang), number: view.channel.wallet ?? "" })}</p>
            <p className="text-sm font-semibold">{t.pay.wallet.timeLeft}: <span className="latin tabular-nums" aria-live="off">{mm}:{ss}</span></p>
            <label className="block">
              <span className="mb-1.5 block text-sm text-ink/70">{t.pay.wallet.otp}</span>
              <input className={`${inputCls} tracking-[0.4em]`} dir="ltr" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} />
            </label>
            <p className="text-xs text-ink/55">{fill(t.pay.triesLeft, { n: view.triesLeft })}</p>
            <button type="submit" disabled={busy || otp.length < 4} className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#111] text-sm font-semibold text-white disabled:opacity-60">{t.pay.wallet.approve}</button>
            <button type="button" onClick={() => setEditing(true)} className="block w-full text-center text-sm font-semibold underline">{t.pay.wallet.back}</button>
          </form>
        )}

        {open && view.method === "card" && (view.step === "details" || editing) && (
          <form onSubmit={sendCard} noValidate className="glass space-y-4 rounded-3xl p-6">
            <h2 className="font-display text-xl font-semibold">{t.pay.card.title}</h2>
            <p className="text-xs text-ink/55">{t.pay.card.accepted}</p>
            <label className="block">
              <span className="mb-1.5 block text-sm text-ink/70">{t.pay.card.number}</span>
              <input className={inputCls} dir="ltr" inputMode="numeric" autoComplete="off" value={card.number} onChange={(e) => setCard({ ...card, number: spaced(e.target.value) })} placeholder="4242 4242 4242 4242" />
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="mb-1.5 block text-sm text-ink/70">{t.pay.card.expiry}</span>
                <input className={inputCls} dir="ltr" inputMode="numeric" autoComplete="off" maxLength={5} value={card.expiry} onChange={(e) => setCard({ ...card, expiry: expiryFmt(e.target.value) })} placeholder="12/29" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm text-ink/70">{t.pay.card.cvv}</span>
                <input className={inputCls} dir="ltr" inputMode="numeric" autoComplete="off" maxLength={3} value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, "") })} placeholder="123" />
              </label>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-sm text-ink/70">{t.pay.card.name}</span>
              <input className="field" autoComplete="off" maxLength={60} value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} />
            </label>
            <button type="submit" disabled={busy} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#111] text-sm font-semibold text-white disabled:opacity-60">
              <Lock size={15} /> {fill(t.pay.card.pay, { amount: pkr(view.amount, lang) })}
            </button>
            <p className="text-center text-xs text-ink/50">{t.pay.securedBy}</p>
          </form>
        )}

        {open && view.method === "card" && view.step === "otp" && !editing && (
          <form onSubmit={sendOtp} noValidate className="glass space-y-4 rounded-3xl p-6">
            <h2 className="font-display text-xl font-semibold">{t.pay.card.secureTitle}</h2>
            <p className="text-sm text-ink/65">{fill(t.pay.card.secureText, { card: `${view.channel.brand ?? ""} ····${view.channel.last4 ?? ""}` })}</p>
            <label className="block">
              <span className="mb-1.5 block text-sm text-ink/70">{t.pay.card.code}</span>
              <input className={`${inputCls} tracking-[0.4em]`} dir="ltr" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} />
            </label>
            <p className="text-xs text-ink/55">{fill(t.pay.triesLeft, { n: view.triesLeft })}</p>
            <button type="submit" disabled={busy || otp.length < 4} className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#111] text-sm font-semibold text-white disabled:opacity-60">{t.pay.card.verify}</button>
            <button type="button" onClick={() => setEditing(true)} className="block w-full text-center text-sm font-semibold underline">{t.pay.card.back}</button>
          </form>
        )}

        {open && view.method === "bank" && view.bank && (
          <form onSubmit={sendReceipt} noValidate className="glass space-y-4 rounded-3xl p-6">
            <h2 className="font-display text-xl font-semibold">{t.pay.bank.title}</h2>
            <p className="text-sm text-ink/65">{view.bank.instructions[lang] || view.bank.instructions.en}</p>
            <p className="rounded-2xl bg-ink/[0.05] p-3 text-xs">{t.pay.bank.steps}</p>
            <dl className="divide-y divide-ink/10 rounded-2xl border border-ink/10 text-sm">
              {([
                [t.pay.bank.account, view.bank.accountTitle],
                [t.pay.bank.bank, view.bank.bankName],
                [t.pay.bank.accountNo, view.bank.accountNo],
                [t.pay.bank.iban, view.bank.iban],
                [t.pay.bank.raast, view.bank.raastId],
                [t.pay.bank.exact, String(view.amount)],
                [t.pay.bank.remark, view.ref],
              ] as [string, string][]).map(([k, v]) => (
                <Copy key={k} label={k} value={v} />
              ))}
            </dl>
            <div>
              <p className="mb-1.5 text-sm font-semibold">{t.pay.bank.upload}</p>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-sm" />
              <p className="mt-1 text-xs text-ink/50">{file ? fill(t.pay.bank.chosen, { name: file.name }) : t.pay.bank.hint}</p>
            </div>
            <button type="submit" disabled={busy || !file} className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#111] text-sm font-semibold text-white disabled:opacity-60">{busy ? t.pay.bank.sending : t.pay.bank.send}</button>
          </form>
        )}

        {view.demo && open && (
          <div className="rounded-2xl border border-dashed border-ink/25 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-ink/55">{t.pay.fill.title}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {view.method === "card" && (view.step === "details" || editing) && (Object.keys(DEMO_CARDS) as (keyof typeof DEMO_CARDS)[]).map((k) => (
                <button key={k} type="button" onClick={() => setCard({ number: DEMO_CARDS[k], expiry: "12/" + yy, cvv: "123", name: card.name || "Demo Customer" })} className="rounded-full border border-ink/20 px-3 py-1.5 text-xs font-semibold hover:bg-ink/10">{t.pay.fill[k]}</button>
              ))}
              {wal && (view.step === "details" || editing) && (Object.keys(DEMO_WALLETS) as (keyof typeof DEMO_WALLETS)[]).map((k) => (
                <button key={k} type="button" onClick={() => setWallet(DEMO_WALLETS[k])} className="rounded-full border border-ink/20 px-3 py-1.5 text-xs font-semibold hover:bg-ink/10">{t.pay.fill[k]}</button>
              ))}
              {(view.step === "otp" || view.step === "approve") && !editing && (view.method === "card" || wal) && (
                <button type="button" onClick={() => setOtp("123456")} className="rounded-full border border-ink/20 px-3 py-1.5 text-xs font-semibold hover:bg-ink/10">{t.pay.fill.otp}</button>
              )}
              {view.method === "bank" && (
                <button type="button" onClick={() => void demoReceipt().then((f) => f && setFile(f))} className="rounded-full border border-ink/20 px-3 py-1.5 text-xs font-semibold hover:bg-ink/10">{t.pay.fill.receipt}</button>
              )}
            </div>
            {sandboxTxt && <p className="mt-3 text-xs leading-relaxed text-ink/65">{sandboxTxt}</p>}
          </div>
        )}

        {open && (
          <button type="button" onClick={cancel} disabled={busy} className="mx-auto block text-sm font-semibold text-ink/60 underline">
            {t.pay.cancel}
          </button>
        )}
      </div>
    </div>
  );
}

function Copy({ label, value }: { label: string; value: string }) {
  const { t } = useI18n();
  const [done, setDone] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <div className="min-w-0">
        <dt className="text-xs text-ink/50">{label}</dt>
        <dd className="latin break-all font-medium" dir="ltr">{value}</dd>
      </div>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard?.writeText(value).then(() => {
            setDone(true);
            setTimeout(() => setDone(false), 1500);
          });
        }}
        className="shrink-0 rounded-full border border-ink/20 px-3 py-1 text-xs font-semibold hover:bg-ink/10"
      >
        {done ? t.pay.bank.copied : t.pay.bank.copy}
      </button>
    </div>
  );
}
