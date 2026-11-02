import RolesAdmin from "@/components/admin/RolesAdmin";
import { pageGuard } from "@/lib/server/admin";
import { getDb } from "@/lib/server/db";

export default async function Page() {
  await pageGuard("roles");
  const db = await getDb();
  const usage: Record<string, number> = {};
  for (const a of db.admins) usage[a.role] = (usage[a.role] ?? 0) + 1;
  return <RolesAdmin roles={db.roles} usage={usage} />;
}
