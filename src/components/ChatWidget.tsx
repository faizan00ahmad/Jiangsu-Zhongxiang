"use client";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { api } from "@/lib/client";
import type { L } from "@/lib/types";

type Msg = { from: "visitor" | "admin"; text: string; at: string };

/** Live chat bubble. The conversation lives on the server (private cookie); while open it checks for replies every 5 seconds. */
export default function ChatWidget({ welcome }: { welcome: L }) {
  const { tx, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const label = lang === "ur" ? "لائیو چیٹ" : "Live chat";

  useEffect(() => {
    if (!open) return;
    let alive = true;
    const pull = () =>
      fetch("/api/chat")
        .then((r) => r.json())
        .then((j: { ok: boolean; messages?: Msg[] }) => alive && j.ok && setMsgs(j.messages ?? []))
        .catch(() => undefined);
    pull();
    const t = setInterval(pull, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [open]);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [msgs.length, open]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const v = text.trim();
    if (!v || busy) return;
    setBusy(true);
    setMsgs((m) => [...m, { from: "visitor", text: v, at: new Date().toISOString() }]);
    setText("");
    await api("/api/chat", { text: v });
    setBusy(false);
  }

  return (
    <div className="no-print fixed bottom-20 end-6 z-[95]">
      {open && (
        <div role="dialog" aria-label={label} className="mb-3 flex h-[420px] w-[min(92vw,340px)] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white text-[#111] shadow-2xl">
          <div className="flex items-center justify-between bg-[#111] px-4 py-3 text-white">
            <p className="text-sm font-semibold">{label}</p>
            <button onClick={() => setOpen(false)} aria-label="Close" className="text-white/70 hover:text-white">
              ✕
            </button>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3 text-sm" data-lenis-prevent>
            <div className="max-w-[85%] rounded-2xl bg-[#f1f1f2] px-3 py-2">{tx(welcome)}</div>
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.from === "visitor" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 ${m.from === "visitor" ? "bg-[#111] text-white" : "bg-[#f1f1f2]"}`} dir="auto">
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={end} />
          </div>
          <form onSubmit={send} className="flex gap-2 border-t border-black/10 p-2.5">
            <input value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} className="min-w-0 flex-1 rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-black/40" dir="auto" aria-label={label} />
            <button disabled={!text.trim() || busy} className="rounded-lg bg-[#111] px-4 text-sm font-semibold text-white disabled:opacity-40">
              {lang === "ur" ? "بھیجیں" : "Send"}
            </button>
          </form>
        </div>
      )}
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={label} className="ms-auto grid h-12 w-12 place-items-center rounded-full bg-[#111] text-white shadow-lg transition hover:scale-105">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4A2.5 2.5 0 0 1 4 13.5z" />
        </svg>
      </button>
    </div>
  );
}
