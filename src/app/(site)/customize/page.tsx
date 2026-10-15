import { SITE_DICT } from "@/i18n/site";
import PageHeader from "@/components/PageHeader";
import { ModelGrid } from "@/components/home/HomeSections";
import { siteData } from "@/lib/server/queries";
import { getLang } from "@/lib/server/session";

export async function generateMetadata() {
  return { title: SITE_DICT[await getLang()].customize.title };
}

export default async function CustomizeIndex() {
  const t = SITE_DICT[await getLang()];
  const { models, colors } = await siteData();
  return (
    <>
      <PageHeader eyebrow={t.customize.choose} title={t.customize.title} text={t.customize.intro} />
      <ModelGrid models={models} colors={colors} detailed />
    </>
  );
}
