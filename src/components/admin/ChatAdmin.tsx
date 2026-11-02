"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Chat } from "@/lib/types";
import { useAdmin } from "./AdminProvider";
import { Btn, Card, PageTitle, Pill, inputCls } from "./ui";

/** Conversations on the left, the open one on the right. Refreshes itself every few seconds. */
export default function ChatAdmin({ chats }: { chats: Chat[] }) {
  const { k, lang, call, can } = useAdmin();
  const router = useRouter();
  const [sel, setSel] = useState<string | null>(chats[0]?.id ?? null);
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const cur = chats.find((c) => c.id === sel) ?? null;
  const edit = can("chat.edit");
  const z = (zh: string, en: string) => (lang === "zh" ? zh : en);

  useEffect(() => {
    const t = setInterval(() => router.refresh(), 6000);
    return () => clearInterval(t);
  }, [router]);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [cur?.messages.length, sel]);
  useEffect(() => {
    if (cur && cur.unread > 0 && edit) void call("/api/admin/chat", { id: cur.id }, "PATCH", true);
  }, [cur?.id, cur?.unread, edit]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <PageTitle title={k.modules.chat} intro={z("网站右下角的在线客服窗口。回复后客户会在聊天窗口立即看到（页面每6秒自动刷新）。", "The chat window on the site. Replies appear in the customer's window within seconds; this page refreshes itself every 6 seconds.")} />
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <Card className="max-h-[70vh] overflow-y-auto !p-2">
          {chats.length === 0 && <p className="p-6 text-center text-sm text-ink/50">{k.table.empty}</p>}
          <ul>
            {[...chats].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((c) => (
              <li key={c.id}>
                <button onClick={() => setSel(c.id)} className={`flex w-full items-start justify-between gap-2 rounded-xl px-3 py-2.5 text-start ${c.id === sel ? "bg-ink/10" : "hover:bg-ink/[0.06]"}`}>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{c.name || z("访客", "Visitor")}</span>
                    <span className="block truncate text-xs text-ink/50">{c.messages[c.messages.length - 1]?.text}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    {c.unread > 0 && <span className="rounded-full bg-[var(--amber)] px-1.5 text-[11px] font-bold text-black">{c.unread}</span>}
                    {c.status === "closed" && <Pill color="#8b93a3">{z("已关闭", "Closed")}</Pill>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
        <Card title={cur ? cur.name || z("访客", "Visitor") : undefined} actions={cur && edit ? <Btn onClick={() => call("/api/admin/chat", { id: cur.id, status: cur.status === "open" ? "closed" : "open" }, "PATCH")}>{cur.status === "open" ? z("关闭对话", "Close chat") : z("重新打开", "Reopen")}</Btn> : undefined}>
          {!cur ? (
            <p className="py-16 text-center text-sm text-ink/50">{z("选择一个对话", "Choose a conversation")}</p>
          ) : (
            <>
              <div className="max-h-[48vh] min-h-[240px] space-y-2 overflow-y-auto pe-1" data-lenis-prevent>
                {cur.messages.map((m, i) => (
                  <div key={i} className={`flex ${m.from === "admin" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${m.from === "admin" ? "bg-[var(--volt)] text-black" : "bg-ink/[0.08]"}`}>
                      <p className="whitespace-pre-wrap break-words" dir="auto">{m.text}</p>
                      <p className="latin mt-0.5 text-[10px] opacity-60">{m.by} · {new Date(m.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  </div>
                ))}
                <div ref={end} />
              </div>
              {edit && (
                <form
                  className="mt-3 flex gap-2"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (text.trim() && (await call("/api/admin/chat", { id: cur.id, text }, "POST", true))) setText("");
                  }}
                >
                  <input className={inputCls} value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder={z("输入回复…", "Type a reply…")} dir="auto" />
                  <Btn tone="primary" disabled={!text.trim()}>
                    {z("发送", "Send")}
                  </Btn>
                </form>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
