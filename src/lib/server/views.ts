import type { DB, Order } from "../types";

/** The slice of an order a customer is allowed to see when tracking. */
export function trackingView(db: DB, o: Order) {
  const dealer = db.dealers.find((d) => d.id === o.contact.dealerId);
  return {
    id: o.id,
    model: o.model,
    modelName: o.modelName,
    color: o.config.color ?? null,
    wheel: o.config.wheel ?? null,
    status: o.status,
    stage: o.stage,
    stageTimes: o.stageTimes,
    eta: o.eta,
    trackingNo: o.trackingNo,
    carrier: o.carrier,
    createdAt: o.createdAt,
    paidAt: o.payment?.paidAt ?? null,
    dealer: dealer ? { name: dealer.name, city: dealer.city, address: dealer.address, phone: dealer.phone } : null,
  };
}
export type TrackingView = ReturnType<typeof trackingView>;
