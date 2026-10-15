import { randomId } from "@/lib/server/crypto";
import { mutate } from "@/lib/server/db";
import { clientIp, fail, ok, readJson, str, throttled } from "@/lib/server/http";
import { currentUser } from "@/lib/server/session";
import { priceQuote } from "@/lib/pricing";
import type { Quote } from "@/lib/types";

/** Generates a PKR quotation from a configuration. Prices are always recomputed on the server. */
export async function POST(req: Request) {
  const b = await readJson(req);
  if (!b) return fail("invalid_input");
  if (throttled(`quote:${clientIp(req)}`, 80)) return fail("too_many_attempts", 429);
  const user = await currentUser();
  const slug = str(b.model, 60);
  const label = str(b.label, 60) || null;
  const quote = await mutate((db) => {
    const model = db.models.find((m) => m.slug === slug && m.enabled);
    if (!model) return null;
    const p = priceQuote(model, db.options, (b.config ?? {}) as Record<string, unknown>);
    const q: Quote = { id: randomId(9), userId: user?.id ?? null, model: model.slug, modelName: model.name, basePrice: model.basePrice, config: p.config, lines: p.lines, total: p.total, range: p.range, label, createdAt: new Date().toISOString() };
    db.quotes.push(q);
    return q;
  });
  if (!quote) return fail("model_unavailable", 404);
  return ok({ id: quote.id, saved: !!user });
}
