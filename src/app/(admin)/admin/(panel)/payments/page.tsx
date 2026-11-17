import { redirect } from "next/navigation";
import PaymentsAdmin from "@/components/admin/PaymentsAdmin";
import { pageGuard } from "@/lib/server/admin";
import { getDb } from "@/lib/server/db";
import { refreshIntent } from "@/lib/server/payments";

export default async function Page() {
  const admin = await pageGuard("payments");
  if (admin.scope === "dealer") redirect("/admin");
  const db = await getDb();
  const rows = [...db.payIntents]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((i) => {
      const copy = { ...i };
      refreshIntent(copy); // an attempt that timed out reads as such here too
      const u = db.users.find((x) => x.id === i.userId);
      return {
        id: i.id,
        ref: i.ref,
        status: copy.status,
        method: i.method,
        mode: i.mode,
        amount: i.amount,
        customer: u?.name ?? "—",
        phone: u?.phone ?? "",
        orders: i.orderIds.map((id) => ({ id, model: db.orders.find((o) => o.id === id)?.modelName ?? "" })),
        channel: i.channel,
        hasReceipt: !!i.receipt,
        receipt: i.receipt,
        reviewNote: i.reviewNote,
        reviewedBy: i.reviewedBy,
        attempts: i.attempts,
        createdAt: i.createdAt,
      };
    });
  return <PaymentsAdmin rows={JSON.parse(JSON.stringify(rows))} />;
}
