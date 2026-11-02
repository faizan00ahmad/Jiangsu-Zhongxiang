import { notFound } from "next/navigation";
import ResourceAdmin from "@/components/admin/ResourceAdmin";
import { RESOURCE } from "@/lib/admin/resources";
import { pageGuard } from "@/lib/server/admin";
import { getDb } from "@/lib/server/db";
import { lookups, seq } from "@/lib/server/resourceApi";

/** Every simple collection (banners, pages, coupons, reviews…) shares this one page; the schema in lib/admin/resources.ts is the screen. */
export default async function ResourcePage({ params }: { params: Promise<{ res: string }> }) {
  const { res: key } = await params;
  const res = RESOURCE[key];
  if (!res) notFound();
  await pageGuard(`${res.module}.view`);
  const db = await getDb();
  let items = seq(db, res);
  if (res.key === "audit") items = items.slice(-1000);
  if (res.key === "outbox") items = items.slice(-1000);
  return <ResourceAdmin resKey={res.key} items={JSON.parse(JSON.stringify(items))} lookups={lookups(db)} />;
}
