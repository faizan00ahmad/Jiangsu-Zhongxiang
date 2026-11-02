import UsersAdmin, { type UserDetail } from "@/components/admin/UsersAdmin";
import { pageGuard } from "@/lib/server/admin";
import { getDb } from "@/lib/server/db";

export default async function Page() {
  await pageGuard("users");
  const db = await getDb();
  const detail: Record<string, UserDetail> = {};
  const rows = [...db.users].map((u) => {
    const orders = db.orders.filter((o) => o.userId === u.id);
    const quotes = db.quotes.filter((q) => q.userId === u.id);
    detail[u.id] = {
      orders: orders.map((o) => ({ id: o.id, model: o.modelName, status: o.status, total: o.total, at: o.createdAt })).sort((a, b) => b.at.localeCompare(a.at)),
      quotes: quotes.map((q) => ({ id: q.id, model: q.modelName, total: q.total, label: q.label, at: q.createdAt })).sort((a, b) => b.at.localeCompare(a.at)),
      wishlist: (u.wishlist ?? []).map((s) => db.models.find((m) => m.slug === s)?.name ?? s),
    };
    return { id: u.id, name: u.name, phone: u.phone, email: u.email, city: u.city, createdAt: u.createdAt, disabled: u.disabled, orders: orders.length, quotes: quotes.length, provider: u.provider ?? null };
  });
  return <UsersAdmin rows={rows} detail={detail} />;
}
