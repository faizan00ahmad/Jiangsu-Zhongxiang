"use client";
import { useEffect } from "react";

/** Tells the server a model page was opened, once per model per browser tab session. Renders nothing. */
export default function ViewPing({ slug }: { slug: string }) {
  useEffect(() => {
    const key = `zx-viewed-${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* storage blocked: count it anyway */
    }
    fetch("/api/models/view", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model: slug }) }).catch(() => {});
  }, [slug]);
  return null;
}
