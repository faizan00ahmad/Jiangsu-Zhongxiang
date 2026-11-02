import type { DB, L } from "../types";
import { defaultCompany, defaultSocial } from "./defaultsV3";
import { cached } from "./cache";

export type NavLink = { key: string | null; label: L; href: string; newTab: boolean };
export type SiteConfig = {
  header: NavLink[];
  footer: NavLink[];
  company: NonNullable<DB["settings"]["company"]>;
  social: NonNullable<DB["settings"]["social"]>;
  webmaster: DB["integrations"]["webmaster"];
  pixelId: string;
  whatsapp: string;
  chat: { enabled: boolean; welcome: L };
  social_login: { google: boolean; facebook: boolean };
  maintenance: boolean;
  currencies: { code: string; symbol: string; rate: number; decimals: number }[];
};

const links = (db: DB, menu: "header" | "footer"): NavLink[] =>
  db.navItems
    .filter((n) => n.menu === menu && n.enabled)
    .sort((a, b) => a.sort - b.sort)
    .map((n) => ({ key: n.key, label: n.label, href: n.href, newTab: n.newTab }));

/** Everything the public layout needs from the admin: menus, contact details, social links, tracking IDs, chat, currencies.
 *  Kept in the app cache; saving any of these in the admin clears it. */
export function siteConfig(db: DB): Promise<SiteConfig> {
  return cached(["content", "settings", "currency"], "site-config", () => ({
    header: links(db, "header"),
    footer: links(db, "footer"),
    company: { ...defaultCompany(), ...db.settings.company },
    social: { ...defaultSocial(), ...db.settings.social },
    webmaster: db.integrations.webmaster,
    pixelId: db.integrations.meta.pixelId,
    whatsapp: db.integrations.meta.whatsapp || db.settings.company?.whatsapp || "",
    chat: db.integrations.chat,
    social_login: { google: db.integrations.social.google.enabled && !!db.integrations.social.google.clientId, facebook: db.integrations.social.facebook.enabled && !!db.integrations.social.facebook.clientId },
    maintenance: db.settings.maintenance === true,
    currencies: db.currencies.filter((c) => c.enabled).map((c) => ({ code: c.code, symbol: c.symbol, rate: c.rate, decimals: c.decimals })),
  }));
}
