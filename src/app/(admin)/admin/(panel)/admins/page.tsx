import AdminsAdmin from "@/components/admin/AdminsAdmin";
import { pageGuard } from "@/lib/server/admin";
import { getDb } from "@/lib/server/db";
import { publicAdmin } from "@/lib/server/session";

export default async function Page() {
  await pageGuard("admins");
  const db = await getDb();
  return <AdminsAdmin rows={db.admins.map(publicAdmin)} dealers={db.dealers.map((d) => ({ id: d.id, name: d.name.en }))} />;
}
