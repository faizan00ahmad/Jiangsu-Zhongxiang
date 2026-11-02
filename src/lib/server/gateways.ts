import type { DB, PayMethod } from "../types";

/** Payment methods the customer may use now. JazzCash and Easypaisa follow their switch in Admin > Integrations; bank transfer and card are always offered. */
export function enabledMethods(db: DB): PayMethod[] {
  const p = db.integrations.payments;
  const out: PayMethod[] = [];
  if (p.jazzcash.enabled) out.push("jazzcash");
  if (p.easypaisa.enabled) out.push("easypaisa");
  out.push("bank", "card");
  return out;
}
