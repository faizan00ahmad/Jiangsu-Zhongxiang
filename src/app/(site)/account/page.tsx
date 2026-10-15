import { redirect } from "next/navigation";
import { SITE_DICT } from "@/i18n/site";
import AccountView from "@/components/account/AccountView";
import { siteData } from "@/lib/server/queries";
import { currentUser, getLang } from "@/lib/server/session";

export async function generateMetadata() {
  return { title: SITE_DICT[await getLang()].account.title, robots: { index: false } };
}

export default async function Account() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/account");
  const { db, colors } = await siteData();
  const quotes = db.quotes.filter((q) => q.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const orders = db.orders.filter((o) => o.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <AccountView
      me={{ name: user.name, phone: user.phone, email: user.email, city: user.city, createdAt: user.createdAt }}
      quotes={quotes}
      orders={orders}
      models={db.models.map((m) => ({ slug: m.slug, kind: m.kind, variant: m.variant, name: m.name, image: m.image, photos: m.photos, colors: m.colors }))}
      colors={colors}
    />
  );
}
