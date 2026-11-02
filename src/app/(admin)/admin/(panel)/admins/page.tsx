import AdminsAdmin from "@/components/admin/AdminsAdmin";
import { pageGuard } from "@/lib/server/admin";
import { getDb } from "@/lib/server/db";

export default async function Page() {
  await pageGuard("admins");
  const db = await getDb();
  const rows = db.admins.map((a) => ({ id: a.id, username: a.username, name: a.name, role: a.role, dealerId: a.dealerId, createdAt: a.createdAt, disabled: a.disabled, lastLoginAt: a.lastLoginAt ?? null }));
  return <AdminsAdmin rows={rows} roles={db.roles} dealers={db.dealers.map((d) => ({ id: d.id, name: d.name.en }))} />;
}
