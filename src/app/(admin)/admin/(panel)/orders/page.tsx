import OrdersAdmin, { type OrderRow } from "@/components/admin/OrdersAdmin";
import { pageGuard, visibleOrders } from "@/lib/server/admin";
import { getDb } from "@/lib/server/db";

export default async function Page() {
  const admin = await pageGuard("orders");
  const db = await getDb();
  const rows: OrderRow[] = visibleOrders(db, admin)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((o) => ({
      id: o.id,
      modelName: o.modelName,
      customer: o.contact.name,
      phone: o.contact.phone,
      dealer: db.dealers.find((d) => d.id === o.contact.dealerId)?.name.en ?? "—",
      status: o.status,
      stage: o.stage,
      total: o.total,
      deposit: o.deposit,
      verified: o.payment ? o.payment.verified : null,
      createdAt: o.createdAt,
    }));
  return <OrdersAdmin rows={rows} />;
}
