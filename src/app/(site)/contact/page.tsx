import Link from "next/link";
import { SITE_DICT } from "@/i18n/site";
import PageHeader from "@/components/PageHeader";
import SocialLinks from "@/components/SocialLinks";
import CopyText from "@/components/CopyText";
import { Mail, Phone, Pin, Clock } from "@/components/Icons";
import { siteData } from "@/lib/server/queries";
import { siteConfig } from "@/lib/server/siteConfig";
import { getLang } from "@/lib/server/session";

export async function generateMetadata() {
  const t = SITE_DICT[await getLang()].contact;
  return { title: t.title, description: t.intro };
}

/** Direct contact hub: the official email first, then phone, WhatsApp, address, hours and social profiles. */
export default async function ContactPage() {
  const lang = await getLang();
  const t = SITE_DICT[lang];
  const { db } = await siteData();
  const { company: co, social } = await siteConfig(db);
  const card = "glass rounded-3xl p-6";
  const label = "text-xs font-bold uppercase tracking-[0.2em] text-ink/50";
  return (
    <>
      <PageHeader eyebrow={t.contact.follow} title={t.contact.title} text={t.contact.intro} />
      <div className="mx-auto grid max-w-6xl gap-6 px-5 pb-12 md:grid-cols-2">
        <section className={`${card} md:col-span-2`}>
          <p className={label}>{t.contact.email}</p>
          <p className="mt-3 flex flex-wrap items-center gap-3">
            <Mail size={22} className="text-[var(--volt)]" />
            <a href={`mailto:${co.email}`} className="latin font-display text-2xl font-semibold hover:text-[var(--volt)] md:text-4xl" dir="ltr">
              {co.email}
            </a>
            <CopyText text={co.email} />
          </p>
          {co.supportEmail && (
            <p className="mt-4 text-sm text-ink/65">
              {t.contact.support}:{" "}
              <a href={`mailto:${co.supportEmail}`} className="latin font-semibold hover:text-[var(--volt)]" dir="ltr">
                {co.supportEmail}
              </a>
            </p>
          )}
        </section>
        <section className={card}>
          <p className={label}>{t.contact.phone}</p>
          <p className="mt-3 flex items-center gap-3">
            <Phone size={20} className="text-[var(--volt)]" />
            <a href={`tel:${co.phone.replace(/\s/g, "")}`} className="latin text-xl font-semibold" dir="ltr">
              {co.phone}
            </a>
          </p>
          {co.whatsapp && (
            <p className="mt-3 text-sm">
              <a href={`https://wa.me/${co.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#128c4a] hover:underline">
                {t.contact.whatsapp}: <span className="latin" dir="ltr">+{co.whatsapp.replace(/\D/g, "")}</span>
              </a>
            </p>
          )}
        </section>
        <section className={card}>
          <p className={label}>{t.contact.address}</p>
          <p className="mt-3 flex gap-3">
            <Pin size={20} className="mt-0.5 shrink-0 text-[var(--volt)]" />
            <span>{co.address[lang] || co.address.en}</span>
          </p>
          {co.hours && (
            <p className="mt-3 flex gap-3 text-sm text-ink/70">
              <Clock size={18} className="mt-0.5 shrink-0" />
              <span>
                <b>{t.contact.hours}:</b> {co.hours[lang] || co.hours.en}
              </span>
            </p>
          )}
          {co.map && (
            <a href={co.map} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-semibold text-[var(--volt)] hover:underline">
              {t.contact.map} →
            </a>
          )}
        </section>
        <section className={`${card} md:col-span-2`}>
          <p className={label}>{t.contact.follow}</p>
          <div className="mt-4">
            <SocialLinks social={social} size={46} />
          </div>
        </section>
        <section className={`${card} md:col-span-2`}>
          <h2 className="font-display text-xl font-semibold">{t.contact.enquiry}</h2>
          <p className="mt-2 max-w-2xl text-ink/65">{t.contact.enquiryText}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/enquiry" className="inline-flex h-11 items-center rounded-md bg-[#111] px-6 text-sm font-semibold text-white">
              {t.contact.enquiryCta}
            </Link>
            <Link href="/test-drive" className="inline-flex h-11 items-center rounded-md border border-ink/20 px-6 text-sm font-semibold">
              {t.contact.testDriveCta}
            </Link>
            <Link href="/partner" className="inline-flex h-11 items-center rounded-md border border-ink/20 px-6 text-sm font-semibold">
              {t.contact.partnerCta}
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
