"use client";
import { useState } from "react";
import type { BackupInfo } from "@/lib/server/db";
import type { Integrations, L, Seo, Settings } from "@/lib/types";
import { api } from "@/lib/client";
import { useAdmin } from "./AdminProvider";
import { ImageInput, LangInput } from "./kit/Fields";
import { Btn, Card, Field, PageTitle, Pill, Toggle, inputCls } from "./ui";

const useZ = () => {
  const { lang } = useAdmin();
  return (zh: string, en: string) => (lang === "zh" ? zh : en);
};
const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

/* ───────────── Backups ───────────── */
export function BackupsAdmin({ backups }: { backups: BackupInfo[] }) {
  const z = useZ();
  const { k, call, can, confirm } = useAdmin();
  const KIND: Record<BackupInfo["kind"], [string, string, string]> = { daily: ["每日自动", "Daily (automatic)", "#3d8bff"], manual: ["手动", "Manual", "#2ee6a6"], migration: ["升级前", "Before upgrade", "#f5b40c"], restore: ["恢复前", "Before restore", "#a78bfa"] };
  return (
    <div>
      <PageTitle
        title={k.modules.backups}
        intro={z("每天自动备份一次（保留14天）；升级数据库或恢复备份前也会自动备份。备份文件保存在“admin pannel/backups”文件夹。", "A backup is made automatically every day (kept 14 days), and before every database upgrade or restore. Files live in the “admin pannel/backups” folder.")}
        actions={
          can("backups.create") && (
            <Btn tone="primary" onClick={() => call("/api/admin/backups", { action: "create" })}>
              + {z("立即备份", "Back up now")}
            </Btn>
          )
        }
      />
      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-start text-xs uppercase tracking-wide text-ink/50">
              <th className="py-2 text-start font-medium">{z("文件", "File")}</th>
              <th className="py-2 text-start font-medium">{z("类型", "Type")}</th>
              <th className="py-2 text-start font-medium">{z("时间", "Created")}</th>
              <th className="py-2 text-end font-medium">{z("大小", "Size")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {backups.map((b) => (
              <tr key={b.name} className="border-b border-ink/[0.07] last:border-0">
                <td className="latin py-2.5 font-mono text-xs">{b.name}</td>
                <td>
                  <Pill color={KIND[b.kind][2]}>{z(KIND[b.kind][0], KIND[b.kind][1])}</Pill>
                </td>
                <td className="latin text-ink/65">{when(b.at)}</td>
                <td className="latin text-end text-ink/65">{(b.size / 1024).toFixed(0)} KB</td>
                <td className="py-2 text-end">
                  <div className="flex justify-end gap-1">
                    {can("backups.export") && (
                      <a className="inline-flex h-9 items-center rounded-lg px-3 text-sm text-ink/60 hover:bg-ink/10 hover:text-ink" href={`/api/admin/backups?name=${encodeURIComponent(b.name)}`}>
                        {z("下载", "Download")}
                      </a>
                    )}
                    {can("backups.edit") && (
                      <Btn
                        tone="ghost"
                        onClick={async () => {
                          if (await confirm(z("用此备份替换当前全部数据？当前数据会先自动备份。", "Replace all current data with this backup? The current data is saved first."))) await call("/api/admin/backups", { action: "restore", name: b.name });
                        }}
                      >
                        {z("恢复", "Restore")}
                      </Btn>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!backups.length && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-ink/50">
                  {k.table.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ───────────── Cache ───────────── */
type Stats = { entries: number; hits: number; misses: number; byTag: Record<string, number>; clearedAt: string | null; clearedBy: string | null };
export function CacheAdmin({ stats }: { stats: Stats }) {
  const z = useZ();
  const { k, call, can } = useAdmin();
  const tags: [string, string, string][] = [
    ["content", "内容（横幅、页面、菜单、博客）", "Content (banners, pages, menus, blog)"],
    ["catalogue", "商品（车型、分类、品牌、评价）", "Catalogue (models, categories, brands, reviews)"],
    ["currency", "币种与汇率", "Currencies and rates"],
    ["settings", "系统设置与集成", "Settings and integrations"],
  ];
  const rate = stats.hits + stats.misses ? Math.round((stats.hits / (stats.hits + stats.misses)) * 100) : 0;
  return (
    <div>
      <PageTitle
        title={k.modules.cache}
        intro={z("网站读取的内容会短时缓存以加快响应；后台保存时会自动清除相关缓存。需要时可在此手动清除。", "Content the site reads is cached briefly for speed. Saving in the admin clears the matching cache automatically; you can also clear it by hand here.")}
        actions={
          can("cache.edit") && (
            <Btn tone="primary" onClick={() => call("/api/admin/cache", {})}>
              {z("清除全部缓存", "Clear all cache")}
            </Btn>
          )
        }
      />
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          [z("缓存条目", "Entries"), stats.entries],
          [z("命中", "Hits"), stats.hits],
          [z("未命中", "Misses"), stats.misses],
          [z("命中率", "Hit rate"), `${rate}%`],
        ].map(([l, v]) => (
          <Card key={String(l)}>
            <p className="text-xs text-ink/50">{l}</p>
            <p className="latin mt-1 text-2xl font-bold">{v}</p>
          </Card>
        ))}
      </div>
      <Card title={z("分组清除", "Clear by group")} className="mt-5" sub={stats.clearedAt ? `${z("上次全部清除", "Last full clear")}: ${when(stats.clearedAt)} · ${stats.clearedBy}` : undefined}>
        <ul className="divide-y divide-ink/10">
          {tags.map(([tag, zh, en]) => (
            <li key={tag} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-medium">{z(zh, en)}</p>
                <p className="text-xs text-ink/45">
                  {stats.byTag[tag] ?? 0} {z("条缓存", "cached items")}
                </p>
              </div>
              {can("cache.edit") && <Btn onClick={() => call("/api/admin/cache", { tag })}>{z("清除", "Clear")}</Btn>}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

/* ───────────── Integrations ───────────── */
export function IntegrationsAdmin({ initial }: { initial: Integrations }) {
  const z = useZ();
  const { k, call, can, toast, err } = useAdmin();
  const [f, setF] = useState<Integrations>(initial);
  const [test, setTest] = useState({ channel: "email" as "email" | "sms", to: "" });
  const dirty = JSON.stringify(f) !== JSON.stringify(initial);
  const edit = can("integrations.edit");
  const up = <K extends keyof Integrations>(key: K, patch: Partial<Integrations[K]>) => setF({ ...f, [key]: { ...f[key], ...patch } });
  const upPay = (id: "jazzcash" | "easypaisa", patch: Partial<Integrations["payments"]["jazzcash"]>) => setF({ ...f, payments: { ...f.payments, [id]: { ...f.payments[id], ...patch } } });
  const upSoc = (id: "google" | "facebook", patch: Partial<Integrations["social"]["google"]>) => setF({ ...f, social: { ...f.social, [id]: { ...f.social[id], ...patch } } });
  const field = (label: string, value: string, on: (v: string) => void, opts: { secret?: boolean; hint?: string; type?: string } = {}) => (
    <Field label={label} hint={opts.hint}>
      <input className={`${inputCls} latin`} type={opts.secret ? "password" : (opts.type ?? "text")} value={value} onChange={(e) => on(e.target.value)} autoComplete="off" disabled={!edit} />
    </Field>
  );
  const sandbox = <Pill color="#f5b40c">{z("沙盒", "Sandbox")}</Pill>;

  return (
    <div>
      <PageTitle
        title={k.modules.integrations}
        intro={z("支付网关、社交登录、短信/Meta、邮件与站长工具。密钥加密保存，页面只显示掩码。未填写真实账号前一律为沙盒模式：消息写入发件箱，付款为模拟。", "Payment gateways, social login, SMS/Meta, email and webmaster tools. Keys are stored encrypted and shown masked. Until real accounts are added everything runs in sandbox mode: messages go to the outbox and payments are simulated.")}
        actions={
          edit && (
            <Btn tone="primary" disabled={!dirty} onClick={() => call("/api/admin/integrations", f, "PUT")}>
              {k.form.save}
            </Btn>
          )
        }
      />
      <div className="grid gap-5 lg:grid-cols-2">
        {(["jazzcash", "easypaisa"] as const).map((id) => (
          <Card key={id} title={id === "jazzcash" ? "JazzCash" : "Easypaisa"} sub={z("支付网关（预付款锁单）", "Payment gateway (advance payment locks the order)")} actions={f.payments[id].mode === "sandbox" ? sandbox : <Pill color="#2ee6a6">Live</Pill>}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Toggle on={f.payments[id].enabled} onChange={(v) => upPay(id, { enabled: v })} label={z("在结算页显示", "Offer at checkout")} />
              </div>
              <Field label={z("模式", "Mode")}>
                <select className={inputCls} value={f.payments[id].mode} onChange={(e) => upPay(id, { mode: e.target.value as "sandbox" | "live" })} disabled={!edit}>
                  <option value="sandbox">{z("沙盒（模拟）", "Sandbox (simulated)")}</option>
                  <option value="live">{z("正式", "Live")}</option>
                </select>
              </Field>
              {field(z("商户号", "Merchant ID"), f.payments[id].merchantId, (v) => upPay(id, { merchantId: v }))}
              <div className="sm:col-span-2">{field(z("密钥 / 集成密码", "Secret / integrity salt"), f.payments[id].secret, (v) => upPay(id, { secret: v }), { secret: true })}</div>
            </div>
          </Card>
        ))}
        {(["google", "facebook"] as const).map((id) => (
          <Card key={id} title={id === "google" ? "Google" : "Facebook"} sub={z("社交登录", "Social login")} actions={f.social[id].enabled && f.social[id].clientId ? <Pill color="#2ee6a6">{z("已启用", "Active")}</Pill> : <Pill color="#8b93a3">{z("未启用", "Off")}</Pill>}>
            <div className="grid gap-3">
              <Toggle on={f.social[id].enabled} onChange={(v) => upSoc(id, { enabled: v })} label={z("在登录页显示按钮", "Show the button on the sign-in page")} />
              {field("Client ID", f.social[id].clientId, (v) => upSoc(id, { clientId: v }))}
              {field("Client secret", f.social[id].secret, (v) => upSoc(id, { secret: v }), { secret: true })}
            </div>
          </Card>
        ))}
        <Card title={z("短信 SMS", "SMS")} sub={z("订单与物流节点短信", "Order and shipping step texts")} actions={f.sms.enabled ? <Pill color="#2ee6a6">{z("已启用", "Active")}</Pill> : sandbox}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Toggle on={f.sms.enabled} onChange={(v) => up("sms", { enabled: v })} label={z("启用真实短信", "Send real SMS")} />
            </div>
            {field(z("服务商", "Provider"), f.sms.provider, (v) => up("sms", { provider: v }))}
            {field(z("发送者名称", "Sender name"), f.sms.sender, (v) => up("sms", { sender: v }))}
            <div className="sm:col-span-2">{field("API key", f.sms.apiKey, (v) => up("sms", { apiKey: v }), { secret: true })}</div>
          </div>
        </Card>
        <Card title="Meta" sub={z("Pixel 与 WhatsApp", "Pixel and WhatsApp")}>
          <div className="grid gap-3">
            {field("Meta Pixel ID", f.meta.pixelId, (v) => up("meta", { pixelId: v }), { hint: z("填写后网站自动加载像素", "The pixel loads on the site once set") })}
            {field(z("WhatsApp 号码", "WhatsApp number"), f.meta.whatsapp, (v) => up("meta", { whatsapp: v }), { hint: z("含国家代码，例如 923001234567；网站显示聊天按钮", "With country code, e.g. 923001234567. A chat button appears on the site") })}
            {field("Conversions API token", f.meta.capiToken, (v) => up("meta", { capiToken: v }), { secret: true })}
          </div>
        </Card>
        <Card title={z("邮件 SMTP", "Email (SMTP)")} sub={z("自动邮件通知", "Automatic email notifications")} actions={f.smtp.enabled ? <Pill color="#2ee6a6">{z("已启用", "Active")}</Pill> : sandbox}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Toggle on={f.smtp.enabled} onChange={(v) => up("smtp", { enabled: v })} label={z("启用真实邮件", "Send real email")} />
            </div>
            {field(z("服务器", "Host"), f.smtp.host, (v) => up("smtp", { host: v }))}
            {field(z("端口", "Port"), String(f.smtp.port), (v) => up("smtp", { port: Number(v) || 587 }), { type: "number" })}
            {field(z("用户名", "Username"), f.smtp.user, (v) => up("smtp", { user: v }))}
            {field(z("密码", "Password"), f.smtp.pass, (v) => up("smtp", { pass: v }), { secret: true })}
            <div className="sm:col-span-2">{field(z("发件人", "From"), f.smtp.from, (v) => up("smtp", { from: v }))}</div>
          </div>
        </Card>
        <Card title={z("站长工具", "Webmaster")} sub={z("搜索引擎验证与统计", "Search engine verification and analytics")}>
          <div className="grid gap-3">
            {field("Google Search Console", f.webmaster.googleVerification, (v) => up("webmaster", { googleVerification: v }), { hint: z("meta 验证码", "The meta verification code") })}
            {field("Bing Webmaster", f.webmaster.bingVerification, (v) => up("webmaster", { bingVerification: v }))}
            {field("Google Analytics ID", f.webmaster.analyticsId, (v) => up("webmaster", { analyticsId: v }), { hint: "G-XXXXXXXXXX" })}
          </div>
        </Card>
        <Card title={z("在线客服", "Live chat")} sub={z("网站右下角聊天窗口", "The chat window at the corner of the site")}>
          <div className="grid gap-3">
            <Toggle on={f.chat.enabled} onChange={(v) => up("chat", { enabled: v })} label={z("在网站显示在线客服", "Show live chat on the site")} />
            <Field label={z("欢迎语", "Welcome message")}>
              <LangInput value={f.chat.welcome as L} onChange={(v) => up("chat", { welcome: v })} area maxLen={300} />
            </Field>
          </div>
        </Card>
      </div>
      {edit && (
        <Card title={z("发送测试消息", "Send a test message")} sub={z("走与订单通知相同的通道，结果见“发件箱”。", "Goes through the same pipeline as order messages. See the result in the Outbox.")} className="mt-5">
          <div className="flex flex-wrap items-end gap-3">
            <Field label={z("渠道", "Channel")}>
              <select className={inputCls} value={test.channel} onChange={(e) => setTest({ ...test, channel: e.target.value as "email" | "sms" })}>
                <option value="email">{z("邮件", "Email")}</option>
                <option value="sms">SMS</option>
              </select>
            </Field>
            <Field label={test.channel === "email" ? z("收件邮箱", "To (email)") : z("手机号", "To (phone)")} className="min-w-[14rem] flex-1">
              <input className={`${inputCls} latin`} value={test.to} onChange={(e) => setTest({ ...test, to: e.target.value })} />
            </Field>
            <Btn
              disabled={!test.to}
              onClick={async () => {
                const r = await api("/api/admin/integrations", test);
                if (r.ok) toast(z("已加入发件箱", "Added to the outbox"));
                else toast(err(r.error), "error");
              }}
            >
              {z("发送", "Send")}
            </Btn>
          </div>
        </Card>
      )}
    </div>
  );
}

/* ───────────── SEO ───────────── */
export function SeoAdmin({ settings, sitemap, robots, gaps }: { settings: Settings; sitemap: string[]; robots: string; gaps: { kind: string; name: string; href: string }[] }) {
  const z = useZ();
  const { k, call, can } = useAdmin();
  const base: Seo = settings.defaultSeo ?? { title: { en: "", ur: "" }, description: { en: "", ur: "" }, image: null, noindex: false };
  const [seo, setSeo] = useState<Seo>(base);
  const [map, setMap] = useState(settings.sitemapEnabled !== false);
  const [extra, setExtra] = useState(settings.robotsExtra ?? "");
  const dirty = JSON.stringify([seo, map, extra]) !== JSON.stringify([base, settings.sitemapEnabled !== false, settings.robotsExtra ?? ""]);
  const edit = can("seo.edit");
  return (
    <div>
      <PageTitle
        title={k.modules.seo}
        intro={z("全站默认的搜索标题与描述（页面、车型、文章可单独设置覆盖）、站点地图与 robots.txt。", "Site-wide default search title and description (pages, models and posts can override them), the sitemap and robots.txt.")}
        actions={
          edit && (
            <Btn tone="primary" disabled={!dirty} onClick={() => call("/api/admin/seo", { defaultSeo: seo, sitemapEnabled: map, robotsExtra: extra }, "PUT")}>
              {k.form.save}
            </Btn>
          )
        }
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title={z("默认 SEO", "Default SEO")}>
          <div className="space-y-4">
            <Field label={k.form.seoTitle}>
              <LangInput value={seo.title} onChange={(v) => setSeo({ ...seo, title: v })} maxLen={120} />
            </Field>
            <Field label={k.form.seoDesc}>
              <LangInput value={seo.description} onChange={(v) => setSeo({ ...seo, description: v })} area maxLen={300} />
            </Field>
            <Field label={k.form.seoImage}>
              <ImageInput value={seo.image} onChange={(v) => setSeo({ ...seo, image: v })} />
            </Field>
            <Toggle on={seo.noindex} onChange={(v) => setSeo({ ...seo, noindex: v })} label={k.form.noindex} />
          </div>
        </Card>
        <Card title={z("站点地图与 robots.txt", "Sitemap and robots.txt")}>
          <div className="space-y-4">
            <Toggle on={map} onChange={setMap} label={z("生成 sitemap.xml", "Serve sitemap.xml")} />
            <Field label={z("robots.txt 追加规则（每行一条）", "Extra robots.txt rules (one per line)")} hint="Disallow: /private">
              <textarea className={`${inputCls} latin min-h-[90px] font-mono text-xs`} value={extra} onChange={(e) => setExtra(e.target.value)} disabled={!edit} />
            </Field>
            <div>
              <p className="mb-1 text-xs font-medium text-ink/60">robots.txt</p>
              <pre className="latin max-h-40 overflow-auto rounded-lg bg-ink/[0.05] p-3 text-xs">{robots}</pre>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-ink/60">sitemap.xml · {sitemap.length} URLs</p>
              <ul className="latin max-h-40 overflow-auto rounded-lg bg-ink/[0.05] p-3 text-xs">
                {sitemap.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      </div>
      <Card title={z("缺少 SEO 描述的内容", "Content without its own SEO description")} sub={z("使用默认描述；单独填写更利于搜索排名。", "These fall back to the default. Writing one helps them rank.")} className="mt-5">
        {gaps.length === 0 ? (
          <p className="text-sm text-ink/50">{z("全部已填写。", "All filled in.")}</p>
        ) : (
          <ul className="divide-y divide-ink/10 text-sm">
            {gaps.map((g) => (
              <li key={g.kind + g.name} className="flex items-center justify-between py-2">
                <span>
                  <Pill color="#8b93a3">{g.kind}</Pill> <span className="ms-2">{g.name}</span>
                </span>
                <a href={g.href} className="text-[var(--volt)] hover:underline">
                  {k.dash.open}
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

/* ───────────── Site health ───────────── */
type Check = { id: string; ok: boolean; note?: string };
type Report = { pages: { path: string; status: number; ms: number; kb: number; checks: Check[] }[]; data: Check[]; at: string };
const LABEL: Record<string, [string, string]> = {
  doctype: ["文档类型 HTML5", "HTML5 doctype"],
  lang: ["html lang 属性", "html lang attribute"],
  viewport: ["viewport（手机适配）", "viewport (mobile)"],
  charset: ["字符编码", "charset"],
  title: ["标题长度 10–70", "title 10–70 chars"],
  description: ["描述长度 50–170", "description 50–170 chars"],
  h1: ["有且仅有一个 h1", "exactly one h1"],
  headings: ["标题层级不跳级", "heading order"],
  alt: ["图片均有 alt", "images have alt"],
  ids: ["id 不重复", "unique ids"],
  canonical: ["canonical 链接", "canonical link"],
  og: ["分享卡片 og:title", "og:title share card"],
  models_photo: ["上架车型均有图片", "listed models have a photo"],
  models_seo: ["车型有独立 SEO 描述", "models have their own SEO description"],
  categories_empty: ["分类下都有车型", "categories have models"],
  pages_urdu: ["页面有乌尔都语正文", "pages have Urdu text"],
  banners_live: ["首页有在线横幅", "a home banner is live"],
  coupons_expired: ["无过期仍启用的优惠券", "no expired coupons left on"],
  currency_rates: ["币种均有汇率", "currencies have rates"],
  unverified_payments: ["无待确认付款", "no payments waiting"],
  sitemap: ["sitemap.xml 可访问", "sitemap.xml reachable"],
  robots: ["robots.txt 可访问", "robots.txt reachable"],
  integrations: ["支付已切换为正式", "payments switched to live"],
};

export function HealthAdmin() {
  const z = useZ();
  const { k, toast, err } = useAdmin();
  const [rep, setRep] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    const r = await api<Report>("/api/admin/health", {});
    setBusy(false);
    if (r.ok) setRep(r as unknown as Report);
    else toast(err(r.error), "error");
  };
  const lbl = (id: string) => z(...(LABEL[id] ?? [id, id]));
  const score = (c: Check[]) => (c.length ? Math.round((c.filter((x) => x.ok).length / c.length) * 100) : 0);
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return (
    <div>
      <PageTitle
        title={k.modules.health}
        intro={z("检查网站页面的 HTML 与 SEO 基础（类似 W3C/Lighthouse 的前几项），并检查后台数据是否完整。正式上线后可用下方官方工具做完整验证。", "Checks the HTML and SEO basics of the site's pages (the first things W3C and Lighthouse look at) and whether the admin data is complete. After launch, use the official tools below for a full audit.")}
        actions={
          <Btn tone="primary" onClick={run} disabled={busy}>
            {busy ? z("检查中…", "Checking…") : z("开始检查", "Run check")}
          </Btn>
        }
      />
      {!rep && !busy && <Card>{<p className="text-sm text-ink/55">{z("点击“开始检查”，约需几秒钟。", "Press “Run check”. It takes a few seconds.")}</p>}</Card>}
      {rep && (
        <div className="space-y-5">
          <Card title={z("页面检查", "Page checks")} sub={when(rep.at)}>
            <div className="overflow-x-auto" data-lenis-prevent>
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-ink/10 text-xs text-ink/50">
                    <th className="py-2 text-start font-medium">{z("页面", "Page")}</th>
                    <th className="py-2 text-start font-medium">{z("状态", "Status")}</th>
                    <th className="py-2 text-start font-medium">{z("耗时", "Time")}</th>
                    <th className="py-2 text-start font-medium">HTML</th>
                    <th className="py-2 text-start font-medium">{z("得分", "Score")}</th>
                    <th className="py-2 text-start font-medium">{z("未通过", "Not passing")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rep.pages.map((p) => {
                    const bad = p.checks.filter((c) => !c.ok);
                    return (
                      <tr key={p.path} className="border-b border-ink/[0.07] align-top last:border-0">
                        <td className="latin py-2 font-mono text-xs">{p.path}</td>
                        <td>
                          <Pill color={p.status === 200 ? "#2ee6a6" : "#ff4d3d"}>{p.status || "—"}</Pill>
                        </td>
                        <td className="latin">{p.ms} ms</td>
                        <td className="latin">{p.kb} KB</td>
                        <td className="latin font-semibold">{p.status === 200 ? `${score(p.checks)}%` : "—"}</td>
                        <td className="text-xs text-ink/65">{bad.map((c) => `${lbl(c.id)}${c.note ? ` (${c.note})` : ""}`).join(" · ") || (p.status === 200 ? "✓" : "")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
          <Card title={z("数据检查", "Data checks")}>
            <ul className="grid gap-2 sm:grid-cols-2">
              {rep.data.map((c) => (
                <li key={c.id} className="flex items-start gap-2 rounded-lg bg-ink/[0.04] p-3 text-sm">
                  <span className={c.ok ? "text-[var(--volt)]" : "text-[var(--amber)]"}>{c.ok ? "✓" : "!"}</span>
                  <span>
                    {lbl(c.id)}
                    {!c.ok && c.note && <span className="block text-xs text-ink/55">{c.note}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
      <Card title={z("官方验证工具（上线后使用）", "Official tools (use after launch)")} sub={z("需要公网域名。", "Needs the public domain.")} className="mt-5">
        <div className="flex flex-wrap gap-2 text-sm">
          <a className="rounded-lg border border-ink/15 px-3 py-2 hover:bg-ink/10" target="_blank" rel="noreferrer" href={`https://validator.w3.org/nu/?doc=${encodeURIComponent(origin)}`}>
            W3C Validator
          </a>
          <a className="rounded-lg border border-ink/15 px-3 py-2 hover:bg-ink/10" target="_blank" rel="noreferrer" href={`https://pagespeed.web.dev/analysis?url=${encodeURIComponent(origin)}`}>
            Google PageSpeed Insights
          </a>
          <a className="rounded-lg border border-ink/15 px-3 py-2 hover:bg-ink/10" target="_blank" rel="noreferrer" href="https://search.google.com/search-console">
            Search Console
          </a>
        </div>
      </Card>
    </div>
  );
}
