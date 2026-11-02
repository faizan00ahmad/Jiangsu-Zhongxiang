import type { Metadata, Viewport } from "next";
import { Inter, Noto_Nastaliq_Urdu, Poppins } from "next/font/google";
import "../globals.css";
import { SITE_DICT } from "@/i18n/site";
import I18nProvider from "@/i18n/I18nProvider";
import Script from "next/script";
import { cookies } from "next/headers";
import CurrencyProvider from "@/components/Currency";
import WishlistProvider from "@/components/Wishlist";
import { currentAdmin, currentUser, getLang } from "@/lib/server/session";
import { siteData } from "@/lib/server/queries";
import { siteConfig } from "@/lib/server/siteConfig";
import Logo from "@/components/Logo";
import WhatsAppButton from "@/components/WhatsAppButton";
import ChatWidget from "@/components/ChatWidget";
import SmoothScroll from "@/components/SmoothScroll";
import Cursor from "@/components/Cursor";
import Preloader from "@/components/Preloader";
import ScrollProgress from "@/components/ScrollProgress";
import Navbar from "@/components/Navbar";
import Footer, { BackToTop } from "@/components/Footer";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
// display face (closest to the REVOO reference); exposed through the shared --font-space variable
const space = Poppins({ variable: "--font-space", subsets: ["latin"], weight: ["300", "400", "500", "600", "700", "800", "900"], style: ["normal", "italic"] });
const urdu = Noto_Nastaliq_Urdu({ variable: "--font-urdu", subsets: ["arabic"], weight: ["400", "500", "600", "700"], preload: false });

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const t = SITE_DICT[lang];
  const { db } = await siteData();
  const cfg = await siteConfig(db);
  const seo = db.settings.defaultSeo;
  const wm = cfg.webmaster;
  return {
    title: { default: seo?.title[lang] || `${t.brand.name} ${t.brand.sub}`, template: `%s | ${t.brand.name}` },
    description: seo?.description[lang] || t.footer.about,
    icons: { icon: "/icon.svg" },
    robots: seo?.noindex ? { index: false, follow: false } : undefined,
    openGraph: { siteName: t.brand.name, type: "website", locale: lang === "ur" ? "ur_PK" : "en_PK", images: seo?.image ? [seo.image] : undefined },
    verification: { google: wm.googleVerification || undefined, other: wm.bingVerification ? { "msvalidate.01": wm.bingVerification } : undefined },
  };
}
export const viewport: Viewport = { themeColor: "#1f1f21" };

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  const user = await currentUser();
  const t = SITE_DICT[lang];
  const { db, models, colors } = await siteData();
  const cfg = await siteConfig(db);
  const staff = cfg.maintenance ? await currentAdmin() : null;
  const closed = cfg.maintenance && !staff;
  const curCookie = (await cookies()).get("zx-cur")?.value ?? "PKR";
  return (
    <html lang={lang === "ur" ? "ur-PK" : "en"} dir={lang === "ur" ? "rtl" : "ltr"} className={`site ${inter.variable} ${space.variable} ${urdu.variable}`} data-theme="light">
      <body className="min-h-screen">
        <a href="#main" className="skip-link">
          {t.nav.skip}
        </a>
        <I18nProvider lang={lang} t={t}>
          <CurrencyProvider list={cfg.currencies} initial={curCookie}>
          <WishlistProvider initial={user?.wishlist ?? []} loggedIn={!!user}>
          <SmoothScroll>
            <Preloader />
            <Cursor />
            <ScrollProgress />
            {closed ? (
              <main id="main" className="grid min-h-[100svh] place-items-center px-6 text-center">
                <div>
                  <Logo size="lg" />
                  <h1 className="font-display mt-8 text-3xl font-bold md:text-5xl">{lang === "ur" ? "سائٹ پر دیکھ بھال جاری ہے" : "We'll be right back"}</h1>
                  <p className="mx-auto mt-4 max-w-md text-ink/65">{lang === "ur" ? "ہم ویب سائٹ کو بہتر بنا رہے ہیں۔ تھوڑی دیر بعد دوبارہ آئیں۔" : "We're improving the site. Please check again in a little while."}</p>
                  <p className="latin mt-6 text-sm text-ink/55">
                    {cfg.company.email} · {cfg.company.phone}
                  </p>
                </div>
              </main>
            ) : (
              <>
                <Navbar user={user ? { name: user.name } : null} models={models.map((m) => ({ slug: m.slug, name: m.name, kind: m.kind, variant: m.variant, color: colors[m.defaultColor] ?? "#ccc", basePrice: m.basePrice, thumb: m.image ?? m.photos.thumb }))} links={cfg.header} />
                <main id="main" className="overflow-x-clip">
                  {children}
                </main>
                <Footer cfg={cfg} />
                <BackToTop />
                {cfg.whatsapp && <WhatsAppButton number={cfg.whatsapp} />}
                {cfg.chat.enabled && <ChatWidget welcome={cfg.chat.welcome} />}
              </>
            )}
            {cfg.webmaster.analyticsId && (
              <>
                <Script src={`https://www.googletagmanager.com/gtag/js?id=${cfg.webmaster.analyticsId}`} strategy="afterInteractive" />
                <Script id="ga-init" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${cfg.webmaster.analyticsId}');`}</Script>
              </>
            )}
            {cfg.pixelId && <Script id="meta-pixel" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${cfg.pixelId}');fbq('track','PageView');`}</Script>}
          </SmoothScroll>
          </WishlistProvider>
          </CurrencyProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
