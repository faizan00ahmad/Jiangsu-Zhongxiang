"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { STAGES } from "@/lib/catalog";
import { fill } from "@/lib/format";
import { useI18n } from "@/i18n/I18nProvider";
import { ChevronFwd } from "@/components/Icons";
import { CORE_ENTRIES } from "@/components/Navbar";
import { SpotCard, ease } from "@/components/ui";

/** The four fixed core entries (PDF requirement) as feature cards that overlap the hero banner. */
export default function CoreEntries({ models, cities }: { models: number; cities: number }) {
  const { t } = useI18n();
  const counts = [models, cities, 0, STAGES.length];
  return (
    <section className="relative z-10 -mt-14 px-4 pb-6 md:px-8">
      <nav aria-label={t.nav.menu} className="mx-auto grid max-w-[1440px] grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
        {CORE_ENTRIES.map(({ key, href, Icon, color, rgb }, k) => (
          <motion.div key={key} initial={{ opacity: 0, y: 36 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-4% 0px" }} transition={{ delay: k * 0.09, duration: 0.8, ease }}>
            <Link href={href} className="group block h-full" style={{ ["--accent-rgb" as string]: rgb, ["--accent" as string]: color } as React.CSSProperties}>
              <SpotCard tilt={3} className="relative flex h-full flex-col rounded-2xl bg-white p-4 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.45)] ring-1 ring-black/[0.06] transition-shadow duration-500 group-hover:shadow-[0_28px_60px_-26px_rgba(0,0,0,0.5)] sm:p-6">
                <div className="flex items-start justify-between">
                  <span
                    className="relative grid h-[72px] w-[72px] place-items-center rounded-2xl ring-1 transition-colors duration-300 sm:h-[92px] sm:w-[92px]"
                    style={{ background: `rgba(${rgb},0.09)`, color, ["--tw-ring-color" as string]: `rgba(${rgb},0.2)` }}
                  >
                    <Icon size={74} className="max-sm:!h-[56px] max-sm:!w-[56px]" />
                  </span>
                  <span aria-hidden className="latin-d select-none text-4xl font-black leading-none text-black/[0.07] sm:text-5xl">
                    0{k + 1}
                  </span>
                </div>
                <h3 className="font-display mt-4 text-[17px] font-semibold leading-snug text-[#111] sm:mt-5 sm:text-xl">{t.nav[key]}</h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#111]/55 sm:text-sm">{t.home.entries[key]}</p>
                <div className="mt-auto flex items-end justify-between gap-2 pt-4 sm:pt-5">
                  <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-semibold text-[#111]/70 sm:text-xs" style={{ background: `rgba(${rgb},0.12)` }}>
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
                    <span className="latin truncate">{fill(t.home.entryMeta[k], { n: counts[k] })}</span>
                  </span>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-black/10 text-[#111] transition-all duration-300 group-hover:border-transparent group-hover:text-white" style={{ ["--hov" as string]: color }}>
                    <span aria-hidden className="absolute h-9 w-9 scale-0 rounded-full opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100" style={{ background: color }} />
                    <ChevronFwd size={15} className="relative transition-transform duration-300 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
                  </span>
                </div>
                <span aria-hidden className="absolute inset-x-0 bottom-0 h-[3px] origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100 rtl:origin-right" style={{ background: color }} />
              </SpotCard>
            </Link>
          </motion.div>
        ))}
      </nav>
    </section>
  );
}
