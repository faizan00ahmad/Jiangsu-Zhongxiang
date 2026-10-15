import { SITE_DICT } from "@/i18n/site";
import PageHeader from "@/components/PageHeader";
import TrackForm from "@/components/orders/TrackForm";
import { getDb } from "@/lib/server/db";
import { currentUser, getLang } from "@/lib/server/session";

export async function generateMetadata() {
  return { title: SITE_DICT[await getLang()].tracking.title };
}

export default async function Tracking() {
  const t = SITE_DICT[await getLang()];
  const user = await currentUser();
  const mine = user
    ? (await getDb()).orders
        .filter((o) => o.userId === user.id && o.status === "active")
        .slice(-4)
        .map((o) => ({ id: o.id, modelName: o.modelName }))
    : [];
  return (
    <>
      <PageHeader eyebrow={t.nav.tracking} title={t.tracking.title} text={t.tracking.intro} accent="#ff4d3d" glow="255,77,61" />
      <TrackForm mine={mine} />
    </>
  );
}
