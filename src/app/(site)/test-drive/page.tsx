import { SITE_DICT } from "@/i18n/site";
import PageHeader from "@/components/PageHeader";
import TestDriveForm from "@/components/testdrive/TestDriveForm";
import { siteData } from "@/lib/server/queries";
import { currentUser, getLang } from "@/lib/server/session";
import { MAX_DAYS_AHEAD, addDaysIso, todayPk } from "@/lib/server/testdrive";

export async function generateMetadata() {
  const t = SITE_DICT[await getLang()].testDrive;
  return { title: t.title, description: t.intro };
}

export default async function TestDrivePage({ searchParams }: { searchParams: Promise<{ model?: string }> }) {
  const t = SITE_DICT[await getLang()];
  const user = await currentUser();
  const { db, models } = await siteData();
  const sp = await searchParams;
  const stores = db.dealers.filter((d) => d.enabled && d.testDrive?.enabled).map((d) => ({ id: d.id, name: d.name, city: d.city, address: d.address, days: d.testDrive!.days, models: d.testDrive!.models }));
  const mine = user
    ? db.testDrives
        .filter((x) => x.userId === user.id)
        .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`))
        .map((x) => ({ id: x.id, model: db.models.find((m) => m.slug === x.model)?.name ?? x.model, store: db.dealers.find((d) => d.id === x.dealerId)?.name.en ?? "", date: x.date, time: x.time, status: x.status }))
    : [];
  const today = todayPk();
  return (
    <>
      <PageHeader eyebrow="Test drive" title={t.testDrive.title} text={t.testDrive.intro} accent="#2ee6a6" glow="46,230,166" />
      <TestDriveForm
        models={models.map((m) => ({ slug: m.slug, name: m.name }))}
        stores={stores}
        mine={mine}
        signedIn={!!user}
        initialModel={models.some((m) => m.slug === sp.model) ? (sp.model as string) : ""}
        minDate={addDaysIso(today, 1)}
        maxDate={addDaysIso(today, MAX_DAYS_AHEAD)}
      />
    </>
  );
}
