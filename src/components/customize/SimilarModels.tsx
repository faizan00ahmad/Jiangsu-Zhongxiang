"use client";
import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";
import { pkr } from "@/lib/format";
import ModelVisual, { type VisualModel } from "@/components/vehicle/ModelVisual";
import { Approx } from "@/components/Currency";
import { WishHeart } from "@/components/Wishlist";

export type SimilarModel = VisualModel & { slug: string; basePrice: number; color: string };

/** "You may also like": the models staff picked for this one, or others of the same type. */
export default function SimilarModels({ models }: { models: SimilarModel[] }) {
  const { t, lang } = useI18n();
  if (!models.length) return null;
  return (
    <section aria-labelledby="similar-h" className="mx-auto max-w-6xl px-5 pb-16">
      <h2 id="similar-h" className="font-display text-2xl font-semibold md:text-3xl">{t.similar.title}</h2>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {models.map((m) => (
          <li key={m.slug} className="glass relative overflow-hidden rounded-3xl">
            <Link href={`/customize/${m.slug}`} className="block">
              <div className="stage px-3 pt-4">
                <ModelVisual model={m} color={m.color} reflection={false} className="aspect-[1000/560] w-full" />
              </div>
              <div className="p-4">
                <p className="latin-d font-semibold">{m.name}</p>
                <p className="mt-1 text-sm text-ink/60">
                  {t.common.from} <b className="text-ink">{pkr(m.basePrice, lang)}</b> <Approx pkr={m.basePrice} />
                </p>
              </div>
            </Link>
            <WishHeart slug={m.slug} className="absolute end-3 top-3" />
          </li>
        ))}
      </ul>
    </section>
  );
}
