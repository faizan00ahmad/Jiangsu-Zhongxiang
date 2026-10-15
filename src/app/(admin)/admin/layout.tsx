import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import Script from "next/script";
import "../../globals.css";
import { ADMIN_DICT } from "@/i18n/admin";
import AdminProvider from "@/components/admin/AdminProvider";
import { currentAdmin, getAdminLang } from "@/lib/server/session";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const space = Space_Grotesk({ variable: "--font-space", subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = { title: { default: "中祥电动车 · 管理后台", template: "%s · ZX Admin" }, robots: { index: false, follow: false }, icons: { icon: "/icon.svg" } };

const THEME_SCRIPT = `try{var t=localStorage.getItem("zx-theme");if(!t)t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";document.documentElement.dataset.theme=t}catch(e){}`;

/** Back office: Chinese by default for domestic operators, one-click English. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const lang = await getAdminLang();
  const a = await currentAdmin();
  return (
    <html lang={lang === "zh" ? "zh-CN" : "en"} dir="ltr" className={`${inter.variable} ${space.variable}`} data-theme="dark" suppressHydrationWarning>
      <body className="admin-font min-h-screen">
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <AdminProvider t={ADMIN_DICT[lang]} lang={lang} me={a ? { id: a.id, name: a.name, username: a.username, role: a.role, dealerId: a.dealerId } : null}>
          {children}
        </AdminProvider>
      </body>
    </html>
  );
}
