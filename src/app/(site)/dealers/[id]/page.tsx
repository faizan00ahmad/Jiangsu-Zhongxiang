import Link from "next/link";
import { notFound } from "next/navigation";
import { SITE_DICT } from "@/i18n/site";
import PageHeader from "@/components/PageHeader";
import { CITIES, stockStatus } from "@/lib/catalog";
import { Phone, Pin, Clock } from "@/components/Icons";
import { siteData } from "@/lib/server/queries";
import { getLang } from "@/lib/server/session";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const lang = await getLang();
  const { id } = await params;
  const d = (await siteData()).db.dealers.find((x) => x.id === id && x.enabled);
  return d ? { title: d.name[lang] || d.name.en, description: d.address[lang] || d.address.en } : {};
}

/** One store: address, hours, map, phone, what is in stock and a test drive shortcut. */
export default async function DealerPage({ params }: { params: Promise<{ id: string }> }) {
  const lang = await getLang();
  const t = SITE_DICT[lang];
  const { db, models } = await siteData();
  const { id } = await params;
  const d = db.dealers.find((x) => x.id === id && x.enabled);
  if (!d) notFound();
  return (
    <>
      <PageHeader eyebrow={CITIES[d.city][lang]} title={d.name[lang] || d.name.en} text={d.address[lang] || d.address.en} />
      <div className="mx-auto grid max-w-6xl gap-6 px-5 pb-16 lg:grid-cols-[1fr_1.2fr]">
        <section className="glass space-y-4 rounded-3xl p-6">
          {d.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={d.image} alt="" className="aspect-[16/9] w-full rounded-2xl object-cover" />
          )}
          <p className="flex gap-3">
            <Pin size={18} className="mt-1 shrink-0 text-[var(--volt)]" />
            <span>
              {d.address[lang] || d.address.en} · {CITIES[d.city][lang]}
            </span>
          </p>
          <p className="flex items-center gap-3">
            <Phone size={18} className="text-[var(--volt)]" />
            <a href={`tel:${d.phone.replace(/\s/g, "")}`} className="latin" dir="ltr">
              {d.phone}
            </a>
          </p>
          {d.hours && (d.hours.en || d.hours.ur) && (
            <p className="flex gap-3 text-ink/75">
              <Clock size={18} className="mt-0.5 shrink-0" />
              <span>{d.hours[lang] || d.hours.en}</span>
            </p>
          )}
          <div className="flex flex-wrap gap-3 pt-2">
            {d.map && (
              <a href={d.map} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center rounded-md border border-ink/20 px-4 text-sm font-semibold">
                {t.contact.map}
              </a>
            )}
            {d.testDrive?.enabled && (
              <Link href="/test-drive" className="inline-flex h-10 items-center rounded-md bg-[#111] px-4 text-sm font-semibold text-white">
                {t.testDrive.cta}
              </Link>
            )}
          </div>
        </section>
        <section className="glass rounded-3xl p-6">
          <h2 className="font-display text-xl font-semibold">{t.inventory.title}</h2>
          <ul className="mt-4 divide-y divide-ink/10">
            {models.map((m) => {
              const s = stockStatus(d.stock[m.slug] ?? 0, db.settings.lowStock);
              return (
                <li key={m.slug} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <Link href={`/customize/${m.slug}`} className="latin-d font-semibold hover:text-[var(--volt)]">
                    {m.name}
                  </Link>
                  <span className={s === "in" ? "text-[#16b364]" : s === "low" ? "text-[#d98a00]" : "text-ink/45"}>{t.inventory.status[s]}</span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </>
  );
}