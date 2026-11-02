import { SITE_DICT } from "@/i18n/site";
import PageHeader from "@/components/PageHeader";
import EnquiryForm from "@/components/enquiry/EnquiryForm";
import { siteData } from "@/lib/server/queries";
import { currentUser, getLang } from "@/lib/server/session";

export async function generateMetadata() {
  const t = SITE_DICT[await getLang()].enquiry;
  return { title: t.title, description: t.intro };
}

export default async function EnquiryPage() {
  const t = SITE_DICT[await getLang()];
  const user = await currentUser();
  const { models } = await siteData();
  return (
    <>
      <PageHeader eyebrow={t.contact.title} title={t.enquiry.title} text={t.enquiry.intro} />
      <div className="px-5 pb-12">
        <EnquiryForm models={models.map((m) => ({ slug: m.slug, name: m.name }))} me={user ? { name: user.name, phone: user.phone, email: user.email ?? "", city: user.city } : null} />
      </div>
    </>
  );
}