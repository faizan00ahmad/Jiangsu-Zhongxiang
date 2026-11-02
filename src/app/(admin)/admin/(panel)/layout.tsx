import { redirect } from "next/navigation";
import AdminShell, { type Alerts } from "@/components/admin/AdminShell";
import { visibleOrders } from "@/lib/server/admin";
import { getDb } from "@/lib/server/db";
import { currentAdmin } from "@/lib/server/session";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");
  const db = await getDb();
  const dealer = admin.dealerId ? db.dealers.find((d) => d.id === admin.dealerId) : null;
  const orders = visibleOrders(db, admin);
  const alerts: Alerts = {
    orders: orders.filter((o) => o.payment && !o.payment.verified && o.status !== "cancelled").length,
    reviews: db.reviews.filter((r) => r.status === "pending").length,
    enquiries: db.enquiries.filter((e) => e.status === "new").length,
    chat: db.chats.reduce((n, c) => n + (c.status === "open" ? c.unread : 0), 0),
    inventory: db.models.filter((m) => m.enabled && (db.factoryStock[m.slug] ?? 0) <= db.settings.lowStock).length,
  };
  return (
    <AdminShell dealerName={dealer?.name.en ?? null} alerts={alerts}>
      {children}
    </AdminShell>
  );
}
