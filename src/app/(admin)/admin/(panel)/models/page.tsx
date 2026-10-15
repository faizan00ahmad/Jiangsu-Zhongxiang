import ModelsAdmin from "@/components/admin/ModelsAdmin";
import { pageGuard } from "@/lib/server/admin";
import { getDb } from "@/lib/server/db";

export default async function Page() {
  await pageGuard("models");
  const db = await getDb();
  return <ModelsAdmin models={[...db.models].sort((a, b) => a.sort - b.sort)} colors={db.options.find((g) => g.key === "color")?.items ?? []} />;
}
