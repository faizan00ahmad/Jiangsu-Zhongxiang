import LogisticsBoard from "@/components/admin/LogisticsBoard";
import { pageGuard } from "@/lib/server/admin";
import { getDb } from "@/lib/server/db";

export default async function Page() {
  await pageGuard("logistics");
  const db = await getDb();
  const items = db.orders
    .filter((o) => o.status === "active")
    .map((o) => ({ id: o.id, modelName: o.modelName, customer: o.contact.name, stage: o.stage, since: o.stageTimes[o.stage], trackingNo: o.trackingNo, verified: !!o.payment?.verified }));
  return <LogisticsBoard items={items} />;
}
