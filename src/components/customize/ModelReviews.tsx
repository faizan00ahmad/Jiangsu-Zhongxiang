"use client";
import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { api, errorText } from "@/lib/client";
import { date, fill } from "@/lib/format";
import { Star } from "@/components/Icons";
import { Notice } from "@/components/ui";

export type ReviewView = { id: string; name: string; rating: number; title: string; body: string; at: string };

export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5 text-amber-500" role="img" aria-label={`${value.toFixed(1)} / 5`} dir="ltr">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} className={value >= i - 0.25 ? "fill-current" : value >= i - 0.75 ? "fill-current opacity-50" : "opacity-30"} />
      ))}
    </span>
  );
}

/** Approved reviews and the average for one model, plus the form for signed-in customers. New reviews are held for approval. */
export default function ModelReviews({ slug, reviews, signedIn, alreadyReviewed }: { slug: string; reviews: ReviewView[]; signedIn: boolean; alreadyReviewed: boolean }) {
  const { t, lang } = useI18n();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!rating) return setErr(errorText(t, "rating_required"));
    setBusy(true);
    const r = await api("/api/reviews", { model: slug, rating, title, body });
    setBusy(false);
    if (!r.ok) return setErr(errorText(t, r.error));
    setSent(true);
  }

  return (
    <section aria-labelledby="reviews-h" className="mx-auto max-w-4xl px-5 py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 id="reviews-h" className="font-display text-2xl font-semibold md:text-3xl">{t.reviews.title}</h2>
        {reviews.length > 0 && (
          <p className="flex items-center gap-2 text-sm text-ink/70">
            <Stars value={avg} size={18} />
            <b className="latin text-ink">{avg.toFixed(1)}</b>
            <span>{fill(t.reviews.count, { n: reviews.length })}</span>
          </p>
        )}
      </div>

      {reviews.length === 0 ? (
        <p className="mt-6 text-ink/60">{t.reviews.none}</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {reviews.map((r) => (
            <li key={r.id} className="glass rounded-2xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2">
                  <Stars value={r.rating} />
                  {r.title && <b>{r.title}</b>}
                </p>
                <p className="text-xs text-ink/50">
                  {r.name} · {date(r.at, lang)}
                </p>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink/75">{r.body}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8">
        {sent ? (
          <Notice tone="ok">{t.reviews.thanks}</Notice>
        ) : !signedIn ? (
          <p className="text-sm text-ink/65">
            <Link href={`/login?next=/customize/${slug}`} className="font-semibold underline">
              {t.nav.login}
            </Link>{" "}
            {t.reviews.loginToReview}
          </p>
        ) : alreadyReviewed ? (
          <p className="text-sm text-ink/65">{t.reviews.already}</p>
        ) : (
          <form onSubmit={submit} noValidate className="glass space-y-4 rounded-2xl p-5">
            <h3 className="font-semibold">{t.reviews.write}</h3>
            <div role="radiogroup" aria-label={t.reviews.rating} className="flex gap-1" dir="ltr">
              {[1, 2, 3, 4, 5].map((i) => (
                <button key={i} type="button" role="radio" aria-checked={rating === i} aria-label={`${i}`} onClick={() => setRating(i)} className="p-0.5 text-amber-500">
                  <Star size={28} className={rating >= i ? "fill-current" : "opacity-35"} />
                </button>
              ))}
            </div>
            <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder={t.reviews.titleHint} aria-label={t.reviews.titleHint} />
            <textarea className="field min-h-28" value={body} onChange={(e) => setBody(e.target.value)} maxLength={1500} placeholder={t.reviews.bodyHint} aria-label={t.reviews.bodyHint} />
            {err && <Notice tone="error">{err}</Notice>}
            <button type="submit" disabled={busy} className="inline-flex min-h-[44px] items-center rounded-md bg-[#111] px-6 text-sm font-semibold text-white disabled:opacity-60">
              {busy ? t.reviews.sending : t.reviews.send}
            </button>
            <p className="text-xs text-ink/50">{t.reviews.moderated}</p>
          </form>
        )}
      </div>
    </section>
  );
}
