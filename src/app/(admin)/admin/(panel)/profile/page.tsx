import ProfileAdmin from "@/components/admin/ProfileAdmin";
import { getDb } from "@/lib/server/db";
import { currentAdmin } from "@/lib/server/session";

export default async function Page() {
  const admin = await currentAdmin();
  const db = await getDb();
  return <ProfileAdmin lastLogin={db.admins.find((a) => a.id === admin?.id)?.lastLoginAt ?? null} />;
}
