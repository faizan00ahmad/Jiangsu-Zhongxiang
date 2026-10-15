import { redirect } from "next/navigation";
import { SITE_DICT } from "@/i18n/site";
import AuthForm from "@/components/account/AuthForm";
import { currentUser, getLang } from "@/lib/server/session";
import { safeNext } from "@/lib/server/http";

export async function generateMetadata() {
  return { title: SITE_DICT[await getLang()].nav.register };
}

export default async function Register({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next, "/account");
  if (await currentUser()) redirect(next);
  return <AuthForm mode="register" next={next} />;
}
