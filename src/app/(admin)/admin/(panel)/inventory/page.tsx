import InventoryAdmin from "@/components/admin/InventoryAdmin";
import { pageGuard } from "@/lib/server/admin";
import { getDb } from "@/lib/server/db";

export default async function Page() {
  const admin = await pageGuard("inventory");
  const db = await getDb();
  const models = [...db.models].sort((a, b) => a.sort - b.sort).map((m) => ({ slug: m.slug, name: m.name }));
  const dealers = admin.role === "dealer" ? db.dealers.filter((d) => d.id === admin.dealerId) : db.dealers;
  return <InventoryAdmin models={models} factory={db.factoryStock} dealers={dealers} low={db.settings.lowStock} canFactory={admin.role !== "dealer"} />;
}
