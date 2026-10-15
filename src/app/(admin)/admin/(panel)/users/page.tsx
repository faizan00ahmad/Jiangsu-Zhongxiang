import UsersAdmin from "@/components/admin/UsersAdmin";
import { pageGuard } from "@/lib/server/admin";
import { getDb } from "@/lib/server/db";

export default async function Page() {
  await pageGuard("users");
  const db = await getDb();
  const rows = [...db.users]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((u) => ({ id: u.id, name: u.name, phone: u.phone, email: u.email, city: u.city, createdAt: u.createdAt, disabled: u.disabled, orders: db.orders.filter((o) => o.userId === u.id).length, quotes: db.quotes.filter((q) => q.userId === u.id).length }));
  return <UsersAdmin rows={rows} />;
}
