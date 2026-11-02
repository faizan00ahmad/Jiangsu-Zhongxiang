/** Demo sign-ins shown on the login pages and listed in admin pannel/docs/DEMO-LOGINS.md.
 *  Safe to keep in the repo: they only exist in demo data and are meant to be replaced before the real launch. */

export type DemoAdmin = { username: string; password: string; name: string; role: string; dealerId: string | null; label: { zh: string; en: string } };
export type DemoCustomer = { phone: string; password: string; name: string; email: string; city: string; label: { zh: string; en: string } };

export const DEMO_ADMINS: DemoAdmin[] = [
  { username: "admin", password: "Admin@2026", name: "超级管理员", role: "super", dealerId: null, label: { zh: "超级管理员（全部功能）", en: "Super admin (everything)" } },
  { username: "operator", password: "Operator@2026", name: "国内运营", role: "operator", dealerId: null, label: { zh: "国内运营（日常运营）", en: "Operations (day-to-day)" } },
  { username: "content.editor", password: "Content@2026", name: "Content Editor", role: "content", dealerId: null, label: { zh: "内容编辑（横幅、页面、博客、SEO）", en: "Content editor (banners, pages, blog, SEO)" } },
  { username: "support.agent", password: "Support@2026", name: "Support Agent", role: "support", dealerId: null, label: { zh: "客服（咨询、评价、聊天、试驾）", en: "Support (enquiries, reviews, chat, test drives)" } },
  { username: "dealer.lahore", password: "Dealer@2026", name: "Gulberg Lahore Store", role: "dealer", dealerId: "dl-lhr-1", label: { zh: "经销商 · 拉合尔 Gulberg", en: "Dealer · Gulberg, Lahore" } },
  { username: "dealer.karachi", password: "Dealer@2026", name: "Shahrah-e-Faisal Karachi Store", role: "dealer", dealerId: "dl-khi-1", label: { zh: "经销商 · 卡拉奇", en: "Dealer · Karachi" } },
];

export const DEMO_CUSTOMERS: DemoCustomer[] = [
  { phone: "03001234567", password: "Demo@2026", name: "Ahmed Raza", email: "ahmed@example.com", city: "lahore", label: { zh: "老客户（已有多个订单）", en: "Returning customer (has orders)" } },
  { phone: "03111234567", password: "Demo@2026", name: "Sara Khan", email: "sara@example.com", city: "karachi", label: { zh: "新客户（无订单，可测试下单）", en: "New customer (no orders; try ordering)" } },
  { phone: "03211234567", password: "Demo@2026", name: "Bilal Hussain", email: "bilal@example.com", city: "islamabad", label: { zh: "新客户（可测试试驾预约）", en: "New customer (try booking a test drive)" } },
];

/** Demo sign-ins are on unless the deployment turns them off (set NEXT_PUBLIC_DEMO_LOGINS=off before going live). */
export const DEMO_ON = process.env.NEXT_PUBLIC_DEMO_LOGINS !== "off";
