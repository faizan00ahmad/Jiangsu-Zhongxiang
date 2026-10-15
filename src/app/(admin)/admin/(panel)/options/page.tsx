import OptionsAdmin from "@/components/admin/OptionsAdmin";
import { pageGuard } from "@/lib/server/admin";
import { getDb } from "@/lib/server/db";

export default async function Page() {
  await pageGuard("options");
  return <OptionsAdmin groups={(await getDb()).options} />;
}
