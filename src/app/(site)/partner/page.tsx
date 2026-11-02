import { SITE_DICT } from "@/i18n/site";
import PageHeader from "@/components/PageHeader";
import PartnerForm from "@/components/partner/PartnerForm";
import { getLang } from "@/lib/server/session";

export async function generateMetadata() {
  const t = SITE_DICT[await getLang()].partner;
  return { title: t.title, description: t.intro };
}

export default async function PartnerPage() {
  const t = SITE_DICT[await getLang()];
  return (
    <>
      <PageHeader eyebrow="Evolta Partner Network" title={t.partner.title} text={t.partner.intro} accent="#3d8bff" glow="61,139,255" />
      <div className="px-5 pb-12">
        <PartnerForm />
      </div>
    </>
  );
}
