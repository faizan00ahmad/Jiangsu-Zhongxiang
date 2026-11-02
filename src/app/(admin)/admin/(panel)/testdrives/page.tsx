import TestDrivesAdmin from "@/components/admin/TestDrivesAdmin";
import { CITIES } from "@/lib/catalog";
import { pageGuard } from "@/lib/server/admin";
import { getDb } from "@/lib/server/db";
import { defaultTestDrive } from "@/lib/server/defaultsV3";

export default async function Page() {
  const admin = await pageGuard("testdrives");
  const db = await getDb();
  const mine = admin.scope === "dealer";
  const rows = db.testDrives
    .filter((t) => !mine || t.dealerId === admin.dealerId)
    .map((t) => ({ id: t.id, date: t.date, time: t.time, status: t.status, model: db.models.find((m) => m.slug === t.model)?.name ?? t.model, store: db.dealers.find((d) => d.id === t.dealerId)?.name.en ?? "", dealerId: t.dealerId, name: t.name, phone: t.phone, note: t.note, adminNote: t.adminNote, createdAt: t.createdAt, history: t.history }));
  const stores = db.dealers.filter((d) => !mine || d.id === admin.dealerId).map((d) => ({ id: d.id, name: d.name.en, city: CITIES[d.city].en, rules: d.testDrive ?? defaultTestDrive() }));
  return <TestDrivesAdmin rows={JSON.parse(JSON.stringify(rows))} stores={stores} models={db.models.filter((m) => m.enabled).map((m) => ({ slug: m.slug, name: m.name }))} />;
}
