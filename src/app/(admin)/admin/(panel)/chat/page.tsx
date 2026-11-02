import { redirect } from "next/navigation";
import ChatAdmin from "@/components/admin/ChatAdmin";
import { pageGuard } from "@/lib/server/admin";
import { getDb } from "@/lib/server/db";

export default async function Page() {
  const admin = await pageGuard("chat");
  if (admin.scope === "dealer") redirect("/admin");
  const db = await getDb();
  return <ChatAdmin chats={JSON.parse(JSON.stringify(db.chats))} />;
}
