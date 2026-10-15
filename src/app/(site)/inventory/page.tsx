import { SITE_DICT } from "@/i18n/site";
import PageHeader from "@/components/PageHeader";
import InventoryView from "@/components/inventory/InventoryView";
import { factoryStatus, siteData } from "@/lib/server/queries";
import { getLang } from "@/lib/server/session";

export async function generateMetadata() {
  return { title: SITE_DICT[await getLang()].inventory.title };
}

export default async function Inventory() {
  const t = SITE_DICT[await getLang()];
  const { db, models, colors } = await siteData();
  const factory = models.map((m) => ({ model: m, ...factoryStatus(db, m.slug) }));
  return (
    <>
      <PageHeader eyebrow={t.inventory.updated} title={t.inventory.title} text={t.inventory.intro} accent="#f5b40c" glow="245,180,12" />
      <InventoryView factory={factory} dealers={db.dealers.filter((d) => d.enabled)} models={models} colors={colors} />
    </>
  );
}
