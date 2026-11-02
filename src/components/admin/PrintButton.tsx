"use client";
import { useAdmin } from "./AdminProvider";

export default function PrintButton() {
  const { lang } = useAdmin();
  return (
    <button onClick={() => window.print()} className="no-print mt-8 inline-flex h-10 items-center rounded-lg bg-[var(--volt)] px-5 text-sm font-semibold text-black print:hidden">
      {lang === "zh" ? "打印 / 保存为 PDF" : "Print / save as PDF"}
    </button>
  );
}
