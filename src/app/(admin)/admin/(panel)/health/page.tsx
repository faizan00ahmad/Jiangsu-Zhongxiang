import { HealthAdmin } from "@/components/admin/SystemScreens";
import { pageGuard } from "@/lib/server/admin";

export default async function Page() {
  await pageGuard("health");
  return <HealthAdmin />;
}