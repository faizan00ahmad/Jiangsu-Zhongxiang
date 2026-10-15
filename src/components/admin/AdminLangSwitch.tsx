"use client";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { Globe } from "@/components/Icons";
import { useAdmin } from "./AdminProvider";

export default function AdminLangSwitch() {
  const { t, lang } = useAdmin();
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await api("/api/admin/lang", { lang: lang === "zh" ? "en" : "zh" });
        router.refresh();
      }}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-ink/15 px-3 text-sm font-medium hover:bg-ink/10"
    >
      <Globe size={15} />
      {t.nav.switchTo}
    </button>
  );
}
