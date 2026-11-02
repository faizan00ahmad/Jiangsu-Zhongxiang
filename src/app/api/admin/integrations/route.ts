import { audit, guard } from "@/lib/server/admin";
import { bust } from "@/lib/server/cache";
import { mutate } from "@/lib/server/db";
import { fail, ok, readJson, str } from "@/lib/server/http";
import { notify } from "@/lib/server/notify";
import { mergeIntegrations } from "@/lib/server/secrets";
import type { Integrations, L } from "@/lib/types";

const B = (v: unknown) => v === true;
const S = (v: unknown, n = 200) => str(v, n);
const L2 = (v: unknown): L => {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  return { en: S(o.en, 300), ur: S(o.ur, 300) };
};
const mode = (v: unknown) => (v === "live" ? "live" : "sandbox");

/** Rebuilds the integrations object from the browser's input, field by field (nothing unknown is stored). */
function clean(i: Record<string, Record<string, unknown>> & Record<string, unknown>): Integrations {
  const p = (k: string) => (i.payments?.[k] ?? {}) as Record<string, unknown>;
  const so = (k: string) => (i.social?.[k] ?? {}) as Record<string, unknown>;
  const sms = (i.sms ?? {}) as Record<string, unknown>;
  const meta = (i.meta ?? {}) as Record<string, unknown>;
  const smtp = (i.smtp ?? {}) as Record<string, unknown>;
  const wm = (i.webmaster ?? {}) as Record<string, unknown>;
  const chat = (i.chat ?? {}) as Record<string, unknown>;
  const port = Number(smtp.port);
  return {
    payments: {
      jazzcash: { enabled: B(p("jazzcash").enabled), mode: mode(p("jazzcash").mode), merchantId: S(p("jazzcash").merchantId, 80), secret: S(p("jazzcash").secret, 300) },
      easypaisa: { enabled: B(p("easypaisa").enabled), mode: mode(p("easypaisa").mode), merchantId: S(p("easypaisa").merchantId, 80), secret: S(p("easypaisa").secret, 300) },
    },
    social: {
      google: { enabled: B(so("google").enabled), clientId: S(so("google").clientId, 200), secret: S(so("google").secret, 300) },
      facebook: { enabled: B(so("facebook").enabled), clientId: S(so("facebook").clientId, 200), secret: S(so("facebook").secret, 300) },
    },
    sms: { enabled: B(sms.enabled), provider: S(sms.provider, 40), sender: S(sms.sender, 20), apiKey: S(sms.apiKey, 300) },
    meta: { pixelId: S(meta.pixelId, 40).replace(/[^\d]/g, ""), whatsapp: S(meta.whatsapp, 20).replace(/[^\d+]/g, ""), capiToken: S(meta.capiToken, 400) },
    smtp: { enabled: B(smtp.enabled), host: S(smtp.host, 120), port: Number.isInteger(port) && port > 0 && port < 65536 ? port : 587, user: S(smtp.user, 120), pass: S(smtp.pass, 300), from: S(smtp.from, 160) },
    webmaster: { googleVerification: S(wm.googleVerification, 120), bingVerification: S(wm.bingVerification, 120), analyticsId: S(wm.analyticsId, 40).replace(/[^\w-]/g, "") },
    chat: { enabled: B(chat.enabled), welcome: L2(chat.welcome) },
  };
}

export async function PUT(req: Request) {
  const g = await guard("integrations.edit");
  if (g.res) return g.res;
  const b = await readJson(req);
  if (!b) return fail("invalid_input");
  await mutate((db) => {
    db.integrations = mergeIntegrations(db.integrations, clean(b as never), process.env.SESSION_SECRET || db.secret);
    audit(db, g.admin, "update", "integrations", "settings", "integration settings saved");
  });
  bust(["settings", "content"], ["/"]);
  return ok();
}

/** POST {channel:"email"|"sms", to}: pushes a test message through the same pipeline orders use. */
export async function POST(req: Request) {
  const g = await guard("integrations.edit");
  if (g.res) return g.res;
  const b = await readJson<{ channel?: string; to?: string }>(req);
  const to = S(b?.to, 120);
  if (!b || !to || (b.channel !== "email" && b.channel !== "sms")) return fail("invalid_input");
  const channel = b.channel;
  const made = await mutate((db) => {
    const id = `test-${channel}`;
    db.templates = db.templates.filter((t) => t.id !== id);
    db.templates.push({ id, event: "test.message", channel, subject: { en: "Test message from Evolta admin", ur: "Test message from Evolta admin" }, body: { en: "This is a test {name}. If you can read it, the channel works.", ur: "This is a test {name}." }, enabled: true });
    const items = notify(db, "test.message", { name: g.admin.name, email: channel === "email" ? to : null, phone: channel === "sms" ? to : null }, {}, "test");
    db.templates = db.templates.filter((t) => t.id !== id);
    audit(db, g.admin, "test", "integrations", channel, to);
    return items.length;
  });
  return made ? ok() : fail("invalid_input");
}
