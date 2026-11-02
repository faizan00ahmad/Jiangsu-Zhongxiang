import type { Role } from "./types";

/** Every admin screen is a module; every module has the same five actions. A permission is the string "module.action". */
export const ACTIONS = ["view", "create", "edit", "delete", "export"] as const;
export type Action = (typeof ACTIONS)[number];

export const GROUPS = ["overview", "catalogue", "sales", "logistics", "customers", "content", "integrations", "seo", "system"] as const;
export type Group = (typeof GROUPS)[number];

/** Sidebar order. `href` is relative to /admin. */
export const MODULES = [
  { key: "dashboard", group: "overview", href: "" },
  { key: "models", group: "catalogue", href: "/models" },
  { key: "categories", group: "catalogue", href: "/categories" },
  { key: "brands", group: "catalogue", href: "/brands" },
  { key: "options", group: "catalogue", href: "/options" },
  { key: "inventory", group: "catalogue", href: "/inventory" },
  { key: "quotes", group: "sales", href: "/quotes" },
  { key: "orders", group: "sales", href: "/orders" },
  { key: "coupons", group: "sales", href: "/coupons" },
  { key: "logistics", group: "logistics", href: "/logistics" },
  { key: "zones", group: "logistics", href: "/zones" },
  { key: "testdrives", group: "logistics", href: "/testdrives" },
  { key: "users", group: "customers", href: "/users" },
  { key: "partners", group: "customers", href: "/partners" },
  { key: "reviews", group: "customers", href: "/reviews" },
  { key: "enquiries", group: "customers", href: "/enquiries" },
  { key: "chat", group: "customers", href: "/chat" },
  { key: "banners", group: "content", href: "/banners" },
  { key: "pages", group: "content", href: "/pages" },
  { key: "nav", group: "content", href: "/nav" },
  { key: "posts", group: "content", href: "/posts" },
  { key: "templates", group: "content", href: "/templates" },
  { key: "outbox", group: "content", href: "/outbox" },
  { key: "integrations", group: "integrations", href: "/integrations" },
  { key: "currencies", group: "integrations", href: "/currencies" },
  { key: "seo", group: "seo", href: "/seo" },
  { key: "health", group: "seo", href: "/health" },
  { key: "cache", group: "seo", href: "/cache" },
  { key: "admins", group: "system", href: "/admins" },
  { key: "roles", group: "system", href: "/roles" },
  { key: "audit", group: "system", href: "/audit" },
  { key: "backups", group: "system", href: "/backups" },
  { key: "settings", group: "system", href: "/settings" },
] as const;
export type ModuleKey = (typeof MODULES)[number]["key"];

/** Modules where create/delete/export make no sense still carry the full set; screens simply never offer them. */
export const ALL_PERMS: string[] = MODULES.flatMap((m) => ACTIONS.map((a) => `${m.key}.${a}`));

const without = (mods: string[]) => ALL_PERMS.filter((p) => !mods.includes(p.split(".")[0]));

const DEALER_PERMS = ["dashboard.view", "inventory.view", "inventory.edit", "orders.view", "orders.edit", "orders.export", "logistics.view", "testdrives.view", "testdrives.edit"];

/** Every action on the given modules. */
const all = (...mods: string[]) => ALL_PERMS.filter((p) => mods.includes(p.split(".")[0]));
const CONTENT_PERMS = ["dashboard.view", ...all("banners", "pages", "nav", "posts", "brands", "categories", "templates", "seo"), "outbox.view", "health.view", "models.view", "models.edit"];
const SUPPORT_PERMS = ["dashboard.view", "users.view", "orders.view", "quotes.view", "outbox.view", ...all("enquiries", "reviews", "chat", "testdrives"), "partners.view", "partners.edit"];

/** Built-in roles. They are stored in the database too, so the admins can edit their permissions or add their own. */
export const DEFAULT_ROLES: Role[] = [
  { id: "super", name: { en: "Super admin", ur: "سپر ایڈمن" }, perms: ALL_PERMS, scope: "all", builtin: true },
  { id: "operator", name: { en: "Operations", ur: "آپریشنز" }, perms: without(["admins", "roles", "settings", "integrations", "backups", "audit", "cache"]), scope: "all", builtin: true },
  { id: "dealer", name: { en: "Dealer store", ur: "ڈیلر اسٹور" }, perms: DEALER_PERMS, scope: "dealer", builtin: true },
  { id: "content", name: { en: "Content editor", ur: "مواد ایڈیٹر" }, perms: CONTENT_PERMS, scope: "all", builtin: true },
  { id: "support", name: { en: "Customer support", ur: "کسٹمر سپورٹ" }, perms: SUPPORT_PERMS, scope: "all", builtin: true },
];

/** The module key of a permission, or the string itself for a bare module name. */
export const moduleOf = (perm: string) => perm.split(".")[0];

/** `has(perms, "orders.edit")`. A bare module name ("orders") means "any action on it". */
export function has(perms: string[], perm: string) {
  if (perm.includes(".")) return perms.includes(perm);
  return perms.some((p) => p.startsWith(`${perm}.`));
}
