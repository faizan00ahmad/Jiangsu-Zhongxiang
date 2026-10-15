import SettingsAdmin from "@/components/admin/SettingsAdmin";
import { pageGuard } from "@/lib/server/admin";
import { getDb } from "@/lib/server/db";

export default async function Page() {
  await pageGuard("settings");
  return <SettingsAdmin s={(await getDb()).settings} />;
}
