"use client";
import Link from "next/link";
import { useState } from "react";
import { CITIES, LAST_STAGE, STAGES } from "@/lib/catalog";
import { date, dateTime, fill, n } from "@/lib/format";
import type { AdminRole, Order, User } from "@/lib/types";
import { Back, Check } from "@/components/Icons";
import { useAdmin } from "./AdminProvider";
import { Btn, Card, Field, Pill, STATUS_COLOR, inputCls } from "./ui";

export default function OrderAdmin({ order: o, user, dealer, role }: { order: Order; user: Pick<User, "name" | "phone" | "email"> | null; dealer: { name: string; city: string; phone: string } | null; role: AdminRole }) {
  const { t, lang, call } = useAdmin();
  const isDealer = role === "dealer";
  const live = o.status === "active";
  const [target, setTarget] = useState(Math.min(o.stage + 1, LAST_STAGE));
  const [eta, setEta] = useState("");
  const [ship, setShip] = useState({ trackingNo: o.trackingNo ?? "", carrier: o.carrier ?? "", eta: o.eta ? o.eta.slice(0, 10) : "" });
  const [confirm, setConfirm] = useState(false);
  const act = (body: Record<string, unknown>) => call(`/api/admin/orders/${o.id}`, body, "PATCH");
  const stageOptions = STAGES.map((s, i) => ({ i, s })).filter(({ i }) => i >= 1 && (!isDealer || i >= LAST_STAGE - 1));

  return (
    <>
      <Link href="/admin/orders" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink/60 hover:text-ink">
        <Back size={15} /> {t.common.back}
      </Link>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-bold">{o.id}</h1>
        <Pill color={STATUS_COLOR[o.status]}>{t.orders.statuses[o.status]}</Pill>
        <span className="text-sm text-ink/50">{dateTime(o.createdAt, lang)}</span>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card title={t.orders.stage} sub={`${t.orders.current}: ${STAGES[o.stage].title[lang]}`}>
            <ol className="grid gap-2 sm:grid-cols-4 2xl:grid-cols-8">
              {STAGES.map((s, i) => {
                const done = o.status === "completed" || i < o.stage;
                const cur = live && i === o.stage;
                return (
                  <li key={s.key} className={`rounded-xl border p-2.5 text-xs ${cur ? "border-[var(--volt)] bg-[var(--volt)]/10" : done ? "border-ink/10 bg-ink/[0.04]" : "border-dashed border-ink/15 text-ink/45"}`}>
                    <span className="flex items-center gap-1 font-bold">
                      {done ? <Check size={12} className="text-[var(--volt)]" /> : `${i + 1}.`} {s.title[lang]}
                    </span>
                    <span className="mt-1 block text-[10px] text-ink/50">{o.stageTimes[i] ? date(o.stageTimes[i], lang) : "—"}</span>
                  </li>
                );
              })}
            </ol>
            {live && (
              <div className="mt-5 flex flex-wrap items-end gap-3 border-t border-ink/10 pt-5">
                {o.stage < LAST_STAGE && (!isDealer || o.stage + 1 >= LAST_STAGE - 1) && (
                  <Btn tone="primary" onClick={() => act({ action: "stage", stage: o.stage + 1 })}>
                    {t.orders.advance} → {STAGES[o.stage + 1].title[lang]}
                  </Btn>
                )}
                <Field label={t.orders.setStage}>
                  <select className={`${inputCls} w-56`} value={target} onChange={(e) => setTarget(Number(e.target.value))}>
                    {stageOptions.map(({ i, s }) => (
                      <option key={s.key} value={i}>
                        {i + 1}. {s.title[lang]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t.orders.eta} hint={t.orders.etaHint}>
                  <input className={`${inputCls} w-44`} type="date" value={eta} onChange={(e) => setEta(e.target.value)} />
                </Field>
                <Btn onClick={() => act({ action: "stage", stage: target, eta: eta || undefined })}>{t.common.save}</Btn>
                {o.stage === LAST_STAGE && (
                  <Btn tone="primary" onClick={() => act({ action: "complete" })}>
                    <Check size={15} /> {t.orders.complete}
                  </Btn>
                )}
              </div>
            )}
          </Card>

          {!isDealer && (
            <Card title={t.orders.tracking}>
              <form
                className="grid gap-4 md:grid-cols-[1fr_1.3fr_auto_auto] md:items-end"
                onSubmit={(e) => {
                  e.preventDefault();
                  act({ action: "shipment", ...ship });
                }}
              >
                <Field label={t.orders.trackingNo}>
                  <input className={inputCls} value={ship.trackingNo} onChange={(e) => setShip({ ...ship, trackingNo: e.target.value })} maxLength={40} />
                </Field>
                <Field label={t.orders.carrier}>
                  <input className={inputCls} value={ship.carrier} onChange={(e) => setShip({ ...ship, carrier: e.target.value })} maxLength={80} placeholder="COSCO · Shanghai → Karachi" />
                </Field>
                <Field label={t.orders.eta}>
                  <input className={inputCls} type="date" value={ship.eta} onChange={(e) => setShip({ ...ship, eta: e.target.value })} />
                </Field>
                <Btn tone="primary">{t.common.save}</Btn>
              </form>
            </Card>
          )}

          <Card title={t.orders.config}>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-ink/[0.07]">
                <tr>
                  <td className="py-2 text-ink/60">{t.orders.model}</td>
                  <td className="py-2 font-semibold">{o.modelName}</td>
                  <td className="py-2 text-end tabular-nums">PKR {n(o.basePrice)}</td>
                </tr>
                {o.lines.map((l) => (
                  <tr key={l.group}>
                    <td className="py-2 text-ink/60">{t.groups[l.group]}</td>
                    <td className="py-2">{l.label.en}</td>
                    <td className="py-2 text-end tabular-nums">{l.price ? `+ ${n(l.price)}` : "—"}</td>
                  </tr>
                ))}
                <tr className="font-bold">
                  <td className="py-2">{t.common.total}</td>
                  <td />
                  <td className="py-2 text-end tabular-nums">PKR {n(o.total)}</td>
                </tr>
              </tbody>
            </table>
          </Card>

          <Card title={t.orders.history}>
            <ul className="space-y-1.5 text-sm">
              {[...o.history].reverse().map((h, i) => (
                <li key={i} className="flex flex-wrap gap-x-3 text-ink/70">
                  <span className="tabular-nums text-ink/45">{dateTime(h.at, lang)}</span>
                  <span className="font-medium">{h.by}</span>
                  <code className="text-xs text-ink/55">{h.action}</code>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card title={t.orders.payment}>
            <dl className="space-y-2 text-sm">
              <Row k={t.orders.deposit} v={`PKR ${n(o.deposit)} (${o.depositPercent}%)`} />
              {o.payment ? (
                <>
                  <Row k={t.orders.method} v={o.payment.method} />
                  <Row k={t.orders.ref} v={o.payment.ref} />
                  <Row k={t.orders.paidAt} v={dateTime(o.payment.paidAt, lang)} />
                  <Row k={t.common.status} v={o.payment.verified ? `${t.orders.verified} · ${o.payment.verifiedBy}` : t.orders.unverified} />
                </>
              ) : (
                <>
                  <Row k={t.common.status} v={t.orders.notPaid} />
                  {o.status === "pending_payment" && <p className="text-xs text-[var(--amber)]">{fill(t.orders.lockUntil, { d: dateTime(o.lockExpiresAt, lang) })}</p>}
                </>
              )}
            </dl>
            {o.payment && !o.payment.verified && !isDealer && (
              <Btn tone="primary" className="mt-4 w-full" onClick={() => act({ action: "verify" })}>
                <Check size={15} /> {t.orders.verify}
              </Btn>
            )}
          </Card>
          <Card title={t.orders.contact}>
            <dl className="space-y-2 text-sm">
              <Row k={t.orders.contact} v={`${o.contact.name} · ${o.contact.phone}`} />
              {user && <Row k={t.orders.customer} v={`${user.name} · ${user.phone}${user.email ? ` · ${user.email}` : ""}`} />}
              {dealer && <Row k={t.orders.dealer} v={`${dealer.name} · ${dealer.city} · ${dealer.phone}`} />}
              <Row k={t.inventory.city} v={CITIES[o.contact.city][lang]} />
            </dl>
          </Card>
          {!isDealer && (o.status === "pending_payment" || o.status === "active") && (
            <Btn
              tone={confirm ? "danger" : "ghost"}
              className="w-full"
              onClick={() => {
                if (!confirm) return setConfirm(true);
                act({ action: "cancel" });
              }}
            >
              {confirm ? t.common.confirmAgain : t.orders.cancel}
            </Btn>
          )}
        </aside>
      </div>
    </>
  );
}

const Row = ({ k, v }: { k: string; v: string }) => (
  <div className="flex justify-between gap-3">
    <dt className="shrink-0 text-ink/55">{k}</dt>
    <dd className="text-end">{v}</dd>
  </div>
);
