import { redirect } from "next/navigation";
import AdminLogin from "@/components/admin/AdminLogin";
import { currentAdmin } from "@/lib/server/session";

export default async function Page() {
  if (await currentAdmin()) redirect("/admin");
  return <AdminLogin />;
}
