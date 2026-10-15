import type { Metadata, Viewport } from "next";
import { Inter, Noto_Nastaliq_Urdu, Poppins } from "next/font/google";
import "../globals.css";
import { SITE_DICT } from "@/i18n/site";
import I18nProvider from "@/i18n/I18nProvider";
import { currentUser, getLang } from "@/lib/server/session";
import { siteData } from "@/lib/server/queries";
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
  const t = SITE_DICT[await getLang()];
  return {
    title: { default: `${t.brand.name} ${t.brand.sub}`, template: `%s | ${t.brand.name}` },
    description: t.footer.about,
    icons: { icon: "/icon.svg" },
  };
}
export const viewport: Viewport = { themeColor: "#1f1f21" };

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  const user = await currentUser();
  const t = SITE_DICT[lang];
  const { models, colors } = await siteData();
  return (
    <html lang={lang === "ur" ? "ur-PK" : "en"} dir={lang === "ur" ? "rtl" : "ltr"} className={`site ${inter.variable} ${space.variable} ${urdu.variable}`} data-theme="light">
      <body className="min-h-screen">
        <a href="#main" className="skip-link">
          {t.nav.skip}
        </a>
        <I18nProvider lang={lang} t={t}>
          <SmoothScroll>
            <Preloader />
            <Cursor />
            <ScrollProgress />
            <Navbar user={user ? { name: user.name } : null} models={models.map((m) => ({ slug: m.slug, name: m.name, kind: m.kind, variant: m.variant, color: colors[m.defaultColor] ?? "#ccc", basePrice: m.basePrice, thumb: m.image ?? m.photos.thumb }))} />
            <main id="main" className="overflow-x-clip">
              {children}
            </main>
            <Footer />
            <BackToTop />
          </SmoothScroll>
        </I18nProvider>
      </body>
    </html>
  );
}
