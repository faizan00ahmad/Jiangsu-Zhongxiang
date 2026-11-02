"use client";
import { useI18n } from "@/i18n/I18nProvider";

type Net = "tiktok" | "facebook" | "instagram" | "youtube";
const ICON: Record<Net, React.ReactNode> = {
  tiktok: <path d="M16.5 3c.4 2.3 1.8 3.7 4 3.9v3.3a7.3 7.3 0 0 1-4-1.300v6.100a5.8 5.8 0 1 1-5.8-5.800c.3 0 .6 0 .9.1v3.400a2.5 2.5 0 1 0 1.7 2.300V3z" />,
  facebook: <path d="M14 8.500V7c0-.7.2-1 1-1h2V3h-3c-2.8 0-4 1.7-4 4v1.500H7.500v3.300H10V21h4v-9.200h2.600L17 8.500z" />,
  instagram: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="3.8" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.2" cy="6.8" r="1.2" />
    </>
  ),
  youtube: <path fillRule="evenodd" d="M4.5 6h15A2.5 2.5 0 0 1 22 8.500v7a2.5 2.5 0 0 1-2.5 2.500h-15A2.5 2.5 0 0 1 2 15.500v-7A2.5 2.5 0 0 1 4.5 6zM10 9v6l5.2-3z" />,
};

/** The native-app address of a profile, tried first on phones. TikTok has no handle-based app link, so it relies on the
 *  https profile link, which the TikTok app claims when it is installed. */
function appLink(net: Net, url: string): string | null {
  const handle = (/\/(?:@)?([\w.]+)\/?(?:\?.*)?$/.exec(url)?.[1] ?? "").replace(/^@/, "");
  if (net === "instagram" && handle) return `instagram://user?username=${handle}`;
  if (net === "facebook") return `fb://facewebmodal/f?href=${encodeURIComponent(url)}`;
  if (net === "youtube" && handle) return `vnd.youtube://www.youtube.com/@${handle}`;
  return null;
}

const isPhone = () => typeof navigator !== "undefined" && /android|iphone|ipad|ipod/i.test(navigator.userAgent);

/** Opens the profile in the native app on a phone, falling back to the web profile if the app does not take over. */
function openInApp(e: React.MouseEvent, net: Net, url: string) {
  const app = appLink(net, url);
  if (!app || !isPhone()) return; // desktop and TikTok: the normal https link does the job
  e.preventDefault();
  const start = Date.now();
  const fallback = window.setTimeout(() => {
    if (document.visibilityState === "visible" && Date.now() - start < 1800) window.location.assign(url); // the app did not take over
  }, 900);
  document.addEventListener("visibilitychange", () => window.clearTimeout(fallback), { once: true });
  window.location.assign(app);
}

/** Social icons. On a phone a tap opens the brand profile in the native app; if the app is missing the web profile opens. */
export default function SocialLinks({ social, tone = "light", size = 40 }: { social: Partial<Record<Net, string>>; tone?: "light" | "dark"; size?: number }) {
  const { t } = useI18n();
  const nets = (Object.keys(ICON) as Net[]).filter((n) => /^https:\/\//.test(social[n] ?? ""));
  if (!nets.length) return null;
  const cls = tone === "dark" ? "border-white/25 text-white/80 hover:bg-white hover:text-black" : "border-ink/20 text-ink/70 hover:bg-ink hover:text-bg";
  return (
    <ul className="flex flex-wrap gap-2.5" aria-label={t.contact.follow}>
      {nets.map((n) => (
        <li key={n}>
          <a href={social[n]} target="_blank" rel="noopener noreferrer" onClick={(e) => openInApp(e, n, social[n]!)} aria-label={t.social.follow.replace("{name}", t.social[n])} title={t.social.follow.replace("{name}", t.social[n])} className={`grid place-items-center rounded-full border transition ${cls}`} style={{ width: size, height: size }}>
            <svg viewBox="0 0 24 24" width={size * 0.48} height={size * 0.48} fill="currentColor" aria-hidden>
              {ICON[n]}
            </svg>
          </a>
        </li>
      ))}
    </ul>
  );
}
