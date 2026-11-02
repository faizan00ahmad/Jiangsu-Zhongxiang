import Link from "next/link";
import { ADMIN_DICT } from "@/i18n/admin";
import { ADMIN_KIT } from "@/i18n/admin-kit";
import { BarList, Funnel, LineChart, Stat } from "@/components/admin/Charts";
import { Card, PageTitle, Pill, STATUS_COLOR, STOCK_COLOR } from "@/components/admin/ui";
import { CITIES, STAGES, stockStatus } from "@/lib/catalog";
import { dateTime, n } from "@/lib/format";
import { has } from "@/lib/perms";
import { pageGuard, visibleOrders } from "@/lib/server/admin";
import { getDb } from "@/lib/server/db";
import { getAdminLang } from "@/lib/server/session";

const RANGES = { today: 1, d7: 7, d30: 30, d90: 90, all: 0 } as const;
type Range = keyof typeof RANGES;
const DAY = 86400000;
const clock = () => Date.now(); // read outside the render function so the page stays pure

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const admin = await pageGuard("dashboard");
  const lang = await getAdminLang();
  const t = ADMIN_DICT[lang];
  const k = ADMIN_KIT[lang];
  const sp = await searchParams;
  const range = (sp.range && sp.range in RANGES ? sp.range : "d30") as Range;
  const db = await getDb();
  const dealerScope = admin.scope === "dealer";
  const now = clock();
  const since = RANGES[range] ? now - RANGES[range] * DAY : 0;
  const inRange = (iso: string) => +new Date(iso) >= since;
  const all = visibleOrders(db, admin);
  const orders = all.filter((o) => inRange(o.createdAt));
  const real = orders.filter((o) => o.status !== "cancelled" && o.status !== "expired");
  const paid = orders.filter((o) => o.payment && (o.status === "active" || o.status === "completed"));
  const quotes = dealerScope ? [] : db.quotes.filter((q) => inRange(q.createdAt));
  const value = real.reduce((s, o) => s + o.total, 0);
  const deposits = paid.filter((o) => o.payment?.verified).reduce((s, o) => s + o.deposit, 0);

  // order value per day over the range (all time → last 90 days)
  const span = RANGES[range] || 90;
  const days = Math.max(span, 2);
  const start = new Date(new Date(now).toISOString().slice(0, 10)).getTime() - (days - 1) * DAY;
  const perDay = Array.from({ length: days }, (_, i) => {
    const d = new Date(start + i * DAY).toISOString().slice(0, 10);
    return { label: d.slice(5), value: real.filter((o) => o.createdAt.slice(0, 10) === d).reduce((s, o) => s + o.total, 0) };
  });
  const byCity = Object.entries(CITIES)
    .map(([c, v]) => ({ label: v[lang], value: real.filter((o) => o.contact.city === c).length }))
    .filter((r) => r.value)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
  const byModel = db.models
    .map((m) => ({ label: m.name, value: real.filter((o) => o.model === m.slug).length }))
    .filter((r) => r.value)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
  const byStage = STAGES.slice(1).map((s, i) => ({ label: s.title[lang], value: all.filter((o) => o.status === "active" && o.stage === i + 1).length }));
  const views = [...db.models].filter((m) => (m.views ?? 0) > 0).sort((a, b) => (b.views ?? 0) - (a.views ?? 0)).slice(0, 6).map((m) => ({ label: m.name, value: m.views ?? 0 }));
  const coupons = db.coupons.filter((c) => c.used > 0).sort((a, b) => b.used - a.used).slice(0, 5).map((c) => ({ label: c.code, value: c.used }));

  const lowStock = db.models
    .filter((m) => m.enabled)
    .map((m) => ({ model: m.name, qty: db.factoryStock[m.slug] ?? 0 }))
    .filter((a) => !dealerScope && stockStatus(a.qty, db.settings.lowStock) !== "in")
    .slice(0, 8);
  const todo = [
    { n: all.filter((o) => o.payment && !o.payment.verified && o.status !== "cancelled").length, label: k.dash.todoVerify, href: "/admin/orders", mod: "orders" },
    { n: dealerScope ? 0 : all.filter((o) => (o.status === "active" || o.status === "pending_payment") && !o.contact.dealerId).length, label: lang === "zh" ? "未选取车门店的订单" : "Orders without a pickup store", href: "/admin/orders", mod: "orders" },
    { n: db.testDrives.filter((d) => d.status === "requested" && (!dealerScope || d.dealerId === admin.dealerId)).length, label: lang === "zh" ? "待确认试驾" : "Test drives to confirm", href: "/admin/testdrives", mod: "testdrives" },
    { n: dealerScope ? 0 : db.partners.filter((p) => p.status === "new").length, label: lang === "zh" ? "新代理商申请" : "New partner applications", href: "/admin/partners", mod: "partners" },
    { n: db.reviews.filter((r) => r.status === "pending").length, label: k.dash.todoReviews, href: "/admin/reviews", mod: "reviews" },
    { n: db.enquiries.filter((e) => e.status === "new").length, label: k.dash.todoEnquiries, href: "/admin/enquiries", mod: "enquiries" },
    { n: db.chats.filter((c) => c.status === "open" && c.unread > 0).length, label: k.dash.todoChats, href: "/admin/chat", mod: "chat" },
    { n: lowStock.length, label: k.dash.todoStock, href: "/admin/inventory", mod: "inventory" },
  ].filter((x) => x.n > 0 && has(admin.perms, `${x.mod}.view`));
  const conv = quotes.length ? Math.round((real.length / quotes.length) * 100) : 0;
  const latest = [...all].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);

  return (
    <>
      <PageTitle
        title={t.dashboard.title}
        intro={t.dashboard.intro}
        actions={
          <div className="flex flex-wrap gap-1 rounded-xl border border-ink/12 bg-card/70 p-1" role="tablist">
            {(Object.keys(RANGES) as Range[]).map((r) => (
              <Link key={r} href={`/admin?range=${r}`} role="tab" aria-selected={r === range} className={`rounded-lg px-3 py-1.5 text-sm ${r === range ? "bg-ink text-bg" : "text-ink/65 hover:bg-ink/10"}`}>
                {k.dash.range[r]}
              </Link>
            ))}
          </div>
        }
      />

      {todo.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--amber)]/40 bg-[var(--amber)]/10 p-3 text-sm">
          <b className="me-1">{k.dash.todo}:</b>
          {todo.map((x) => (
            <Link key={x.label} href={x.href} className="rounded-full bg-card px-3 py-1 hover:bg-ink/10">
              {x.label} · <b>{x.n}</b>
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={k.dash.revenue} value={`PKR ${n(value)}`} sub={`${real.length} ${k.dash.orders}`} tone="#3d8bff" />
        <Stat label={k.dash.deposits} value={`PKR ${n(deposits)}`} sub={`${paid.length} ${k.dash.orders}`} />
        <Stat label={k.dash.pendingPay} value={n(orders.filter((o) => o.status === "pending_payment").length)} tone="#f5b40c" />
        <Stat label={k.dash.avgOrder} value={`PKR ${n(real.length ? Math.round(value / real.length) : 0)}`} tone="#a78bfa" />
        {!dealerScope && <Stat label={k.dash.quotes} value={n(quotes.length)} sub={`${k.dash.conversion} ${conv}%`} tone="#14b8a6" />}
        {!dealerScope && <Stat label={t.dashboard.users} value={n(db.users.filter((u) => inRange(u.createdAt)).length)} sub={`${n(db.users.length)} ${k.dash.range.all}`} tone="#ff4d3d" />}
        <Stat label={t.dashboard.activeOrders} value={n(all.filter((o) => o.status === "active").length)} />
        <Stat label={t.dashboard.totalOrders} value={n(all.length)} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card title={k.dash.perDay}>
          <LineChart points={perDay} prefix="PKR " empty={k.dash.noData} />
        </Card>
        {!dealerScope ? (
          <Card title={k.dash.funnel}>
            <Funnel
              empty={k.dash.noData}
              steps={[
                { label: k.dash.funnelQuotes, value: quotes.length },
                { label: k.dash.funnelOrders, value: real.length },
                { label: k.dash.funnelPaid, value: paid.length },
                { label: k.dash.funnelDone, value: orders.filter((o) => o.status === "completed" || (o.status === "active" && o.stage === STAGES.length - 1)).length },
              ]}
            />
          </Card>
        ) : (
          <Card title={k.dash.byStage}>
            <BarList rows={byStage} color="#f5b40c" empty={k.dash.noData} />
          </Card>
        )}
        <Card title={k.dash.byModel}>
          <BarList rows={byModel} empty={k.dash.noData} />
        </Card>
        <Card title={k.dash.byCity}>
          <BarList rows={byCity} color="var(--blue)" empty={k.dash.noData} />
        </Card>
        {!dealerScope && (
          <Card title={k.dash.byStage}>
            <BarList rows={byStage} color="#f5b40c" empty={k.dash.noData} />
          </Card>
        )}
        {!dealerScope && (
          <Card title={t.dashboard.lowStock}>
            {lowStock.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink/45">{t.dashboard.lowStockNone}</p>
            ) : (
              <ul className="divide-y divide-ink/10 text-sm">
                {lowStock.map((a) => {
                  const s = stockStatus(a.qty, db.settings.lowStock);
                  return (
                    <li key={a.model} className="flex items-center justify-between gap-3 py-2">
                      <b>{a.model}</b>
                      <Pill color={STOCK_COLOR[s]}>
                        {t.inventory.status[s]} · {a.qty}
                      </Pill>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        )}
        {!dealerScope && views.length > 0 && (
          <Card title={k.dash.views}>
            <BarList rows={views} color="#a78bfa" empty={k.dash.noData} />
          </Card>
        )}
        {!dealerScope && coupons.length > 0 && (
          <Card title={k.dash.coupons}>
            <BarList rows={coupons} color="#14b8a6" empty={k.dash.noData} />
          </Card>
        )}
      </div>

      <Card className="mt-6" title={k.dash.latest} actions={<Link href="/admin/orders" className="text-sm text-[var(--volt)]">→</Link>}>
        <div className="overflow-x-auto" data-lenis-prevent>
          <table className="w-full min-w-[640px] text-sm">
            <tbody className="divide-y divide-ink/10">
              {latest.map((o) => (
                <tr key={o.id}>
                  <td className="py-2.5">
                    <Link href={`/admin/orders/${o.id}`} className="latin font-semibold hover:text-[var(--volt)]">
                      {o.id}
                    </Link>
                  </td>
                  <td>{o.modelName}</td>
                  <td className="text-ink/60">{o.contact.name}</td>
                  <td>
                    <Pill color={STATUS_COLOR[o.status]}>{t.orders.statuses[o.status]}</Pill>
                  </td>
                  <td className="text-ink/60">{STAGES[o.stage].title[lang]}</td>
                  <td className="latin text-end tabular-nums">PKR {n(o.total)}</td>
                  <td className="text-end text-ink/50">{dateTime(o.createdAt, lang)}</td>
                </tr>
              ))}
              {latest.length === 0 && (
                <tr>
                  <td className="py-8 text-center text-ink/45">{k.dash.noData}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
