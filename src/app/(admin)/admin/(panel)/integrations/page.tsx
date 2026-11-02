import { IntegrationsAdmin } from "@/components/admin/SystemScreens";
import { pageGuard } from "@/lib/server/admin";
import { getDb } from "@/lib/server/db";
import { maskIntegrations } from "@/lib/server/secrets";

export default async function Page() {
  await pageGuard("integrations");
  return <IntegrationsAdmin initial={maskIntegrations((await getDb()).integrations)} />;
}