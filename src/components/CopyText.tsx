"use client";
import { useState } from "react";

export default function CopyText({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        } catch {
          // clipboard blocked: the address is still a mailto link
        }
      }}
      className="rounded-md border border-ink/20 px-3 py-1 text-xs font-semibold transition hover:bg-ink hover:text-bg"
    >
      {done ? "✓" : "Copy"}
    </button>
  );
}
