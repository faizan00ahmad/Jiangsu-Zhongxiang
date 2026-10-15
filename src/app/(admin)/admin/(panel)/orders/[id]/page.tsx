import { redirect } from "next/navigation";
import OrderAdmin from "@/components/admin/OrderAdmin";
import { CITIES } from "@/lib/catalog";
import { pageGuard, visibleOrders } from "@/lib/server/admin";
import { getDb } from "@/lib/server/db";
import { getAdminLang } from "@/lib/server/session";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const admin = await pageGuard("orders");
  const { id } = await params;
  const db = await getDb();
  const o = visibleOrders(db, admin).find((x) => x.id === id);
  if (!o) redirect("/admin/orders");
  const lang = await getAdminLang();
  const u = db.users.find((x) => x.id === o.userId);
  const d = db.dealers.find((x) => x.id === o.contact.dealerId);
  return <OrderAdmin order={o} role={admin.role} user={u ? { name: u.name, phone: u.phone, email: u.email } : null} dealer={d ? { name: d.name.en, city: CITIES[d.city][lang], phone: d.phone } : null} />;
}
