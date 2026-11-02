import { BackupsAdmin } from "@/components/admin/SystemScreens";
import { pageGuard } from "@/lib/server/admin";
import { listBackups } from "@/lib/server/db";

export default async function Page() {
  await pageGuard("backups");
  return <BackupsAdmin backups={await listBackups()} />;
}