import { CacheAdmin } from "@/components/admin/SystemScreens";
import { pageGuard } from "@/lib/server/admin";
import { cacheStats } from "@/lib/server/cache";

export default async function Page() {
  await pageGuard("cache");
  return <CacheAdmin stats={cacheStats()} />;
}