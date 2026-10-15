import Link from "next/link";
import { ADMIN_DICT } from "@/i18n/admin";
import { BarList, Stat } from "@/components/admin/Charts";
import { Card, PageTitle, Pill, STATUS_COLOR, STOCK_COLOR } from "@/components/admin/ui";
import { CITIES, STAGES, stockStatus } from "@/lib/catalog";
import { dateTime, fill, n } from "@/lib/format";
import { activeGroups } from "@/lib/pricing";
import { pageGuard, visibleOrders } from "@/lib/server/admin";
import { getDb } from "@/lib/server/db";
import { getAdminLang } from "@/lib/server/session";

export default async function Dashboard() {
  const admin = await pageGuard("dashboard");
  const lang = await getAdminLang();
  const t = ADMIN_DICT[lang];
  const db = await getDb();
  const orders = visibleOrders(db, admin);
  const paid = orders.filter((o) => o.payment && (o.status === "active" || o.status === "completed"));
  const active = orders.filter((o) => o.status === "active");
  const pending = orders.filter((o) => o.status === "pending_payment");
  const deposits = paid.reduce((s, o) => s + o.deposit, 0);
  const value = paid.reduce((s, o) => s + o.total, 0);

  const sales = db.models.map((m) => ({ label: m.name, value: paid.filter((o) => o.model === m.slug).length })).sort((a, b) => b.value - a.value);
  const popular = activeGroups(db.options).map((g) => {
    const counts = g.items.map((i) => ({ i, c: paid.filter((o) => o.config[g.key] === i.id).length })).sort((a, b) => b.c - a.c);
    const top = counts[0];
    return { label: `${t.groups[g.key]} · ${top.i.label.en}`, value: top.c, sub: `${Math.round((top.c / Math.max(1, paid.length)) * 100)}% ${t.dashboard.share}` };
  });
  const byStage = STAGES.slice(1).map((s, k) => ({ label: s.title[lang], value: active.filter((o) => o.stage === k + 1).length }));

  const alerts = [
    ...(admin.role === "dealer" ? [] : db.models.filter((m) => m.enabled).map((m) => ({ who: t.dashboard.factory, model: m.name, qty: db.factoryStock[m.slug] ?? 0 }))),
    ...db.dealers
      .filter((d) => d.enabled && (admin.role !== "dealer" || d.id === admin.dealerId))
      .flatMap((d) => db.models.filter((m) => m.enabled && admin.role === "dealer").map((m) => ({ who: `${d.name.en} · ${CITIES[d.city][lang]}`, model: m.name, qty: d.stock[m.slug] ?? 0 }))),
  ].filter((a) => stockStatus(a.qty, db.settings.lowStock) !== "in");

  return (
    <>
      <PageTitle title={t.dashboard.title} intro={t.dashboard.intro} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Stat label={t.dashboard.totalOrders} value={n(orders.length)} sub={`${t.dashboard.activeOrders} ${active.length}`} />
        <Stat label={t.dashboard.pendingPay} value={n(pending.length)} tone="#f5b40c" />
        <Stat label={t.dashboard.deposits} value={`PKR ${n(deposits)}`} sub={`${paid.length} ${t.dashboard.orders}`} tone="#3d8bff" />
        <Stat label={t.dashboard.salesValue} value={`PKR ${n(value)}`} tone="#3d8bff" />
        {admin.role !== "dealer" && <Stat label={t.dashboard.users} value={n(db.users.length)} tone="#ff4d3d" />}
        <Stat label={t.dashboard.activeOrders} value={n(active.length)} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title={t.dashboard.salesByModel} sub={t.dashboard.salesByModelSub}>
          <BarList rows={sales} empty={t.common.noData} />
        </Card>
        <Card title={t.dashboard.popular} sub={t.dashboard.popularSub}>
          <BarList rows={popular} color="var(--blue)" empty={t.common.noData} />
        </Card>
        <Card title={t.dashboard.byStage} sub={t.dashboard.byStageSub}>
          <BarList rows={byStage} color="#f5b40c" empty={t.common.noData} />
        </Card>
        <Card title={t.dashboard.lowStock} sub={fill(t.inventory.threshold, { n: db.settings.lowStock })}>
          {alerts.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink/45">{t.dashboard.lowStockNone}</p>
          ) : (
            <ul className="divide-y divide-ink/10 text-sm">
              {alerts.slice(0, 10).map((a, i) => {
                const s = stockStatus(a.qty, db.settings.lowStock);
                return (
                  <li key={i} className="flex items-center justify-between gap-3 py-2">
                    <span>
                      <b>{a.model}</b> <span className="text-ink/50">· {a.who}</span>
                    </span>
                    <Pill color={STOCK_COLOR[s]}>
                      {t.inventory.status[s]} · {a.qty}
                    </Pill>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-6" title={t.dashboard.recent} actions={<Link href="/admin/orders" className="text-sm text-[var(--volt)]">→</Link>}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <tbody className="divide-y divide-ink/10">
              {[...orders]
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                .slice(0, 6)
                .map((o) => (
                  <tr key={o.id}>
                    <td className="py-2.5">
                      <Link href={`/admin/orders/${o.id}`} className="font-semibold hover:text-[var(--volt)]">
                        {o.id}
                      </Link>
                    </td>
                    <td>{o.modelName}</td>
                    <td className="text-ink/60">{o.contact.name}</td>
                    <td>
                      <Pill color={STATUS_COLOR[o.status]}>{t.orders.statuses[o.status]}</Pill>
                    </td>
                    <td className="text-ink/60">{STAGES[o.stage].title[lang]}</td>
                    <td className="text-end tabular-nums">PKR {n(o.total)}</td>
                    <td className="text-end text-ink/50">{dateTime(o.createdAt, lang)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
