import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { getDb } from "@/lib/server/db";
import { currentAdmin } from "@/lib/server/session";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");
  const db = await getDb();
  const dealer = admin.dealerId ? db.dealers.find((d) => d.id === admin.dealerId) : null;
  const pending = db.orders.filter((o) => o.status === "pending_payment" || (o.payment && !o.payment.verified)).length;
  return (
    <AdminShell dealerName={dealer?.name.en ?? null} badge={admin.role === "dealer" ? 0 : pending}>
      {children}
    </AdminShell>
  );
}
