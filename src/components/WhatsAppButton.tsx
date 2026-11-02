"use client";
import { useI18n } from "@/i18n/I18nProvider";

/** Floating WhatsApp shortcut, shown when a number is set in Admin > Integrations (Meta) or Settings. */
export default function WhatsAppButton({ number }: { number: string }) {
  const { t } = useI18n();
  const n = number.replace(/[^\d]/g, "");
  if (!n) return null;
  return (
    <a href={`https://wa.me/${n}`} target="_blank" rel="noopener noreferrer" aria-label={t.contact.whatsapp} title={t.contact.whatsapp} className="no-print fixed bottom-6 start-6 z-[90] grid h-12 w-12 place-items-center rounded-full bg-[#25d366] text-white shadow-lg transition hover:scale-105">
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 5.5A2.500 2.500 0 0 1 6.500 3h11A2.500 2.500 0 0 1 20 5.500v8a2.500 2.500 0 0 1-2.500 2.500H10l-4.500 4v-4A2.500 2.500 0 0 1 4 13.500z" />
        <path d="M8.500 8.500h7M8.500 11.500h4.500" />
      </svg>
    </a>
  );
}
