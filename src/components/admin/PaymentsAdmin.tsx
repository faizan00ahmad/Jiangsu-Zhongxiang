"use client";
import { useState } from "react";
import type { PayAttempt, PayMethod, PayMode, PayStatus } from "@/lib/types";
import { n } from "@/lib/format";
import { useAdmin } from "./AdminProvider";
import DataTable, { type Col } from "./kit/DataTable";
import Modal from "./kit/Modal";
import { Btn, Field, PageTitle, Pill, inputCls } from "./ui";

export type PayRow = {
  id: string;
  ref: string;
  status: PayStatus;
  method: PayMethod;
  mode: PayMode;
  amount: number;
  customer: string;
  phone: string;
  orders: { id: string; model: string }[];
  channel: { wallet?: string; brand?: string; last4?: string };
  hasReceipt: boolean;
  receipt: string | null;
  reviewNote: string;
  reviewedBy: string | null;
  attempts: PayAttempt[];
  createdAt: string;
};

const COLOR: Record<PayStatus, string> = { created: "#8b93a3", awaiting: "#f5b40c", review: "#3d8bff", succeeded: "#2ee6a6", failed: "#ff4d3d", cancelled: "#8b93a3", expired: "#8b93a3" };
const METHOD: Record<PayMethod, string> = { jazzcash: "JazzCash", easypaisa: "Easypaisa", card: "Card", bank: "Bank transfer" };

export default function PaymentsAdmin({ rows }: { rows: PayRow[] }) {
  const { k, lang, call, can } = useAdmin();
  const z = (zh: string, en: string) => (lang === "zh" ? zh : en);
  const ST: Record<PayStatus, string> = { created: z("已创建", "Started"), awaiting: z("等待客户", "Awaiting customer"), review: z("待审核", "To review"), succeeded: z("已收款", "Paid"), failed: z("失败", "Failed"), cancelled: z("已取消", "Cancelled"), expired: z("已过期", "Expired") };
  const [open, setOpen] = useState<PayRow | null>(null);
  const [note, setNote] = useState("");
  const edit = can("payments.edit");
  const waiting = rows.filter((r) => r.status === "review").length;
  const channelText = (r: PayRow) => (r.channel.last4 ? `${r.channel.brand} ····${r.channel.last4}` : (r.channel.wallet ?? "—"));

  const cols: Col<PayRow>[] = [
    { key: "ref", header: z("参考号", "Reference"), value: (r) => r.ref, render: (r) => <span className="latin font-mono text-xs font-semibold">{r.ref}</span> },
    { key: "status", header: z("状态", "Status"), value: (r) => ST[r.status], render: (r) => <Pill color={COLOR[r.status]}>{ST[r.status]}</Pill> },
    { key: "method", header: z("方式", "Method"), value: (r) => METHOD[r.method] },
    { key: "amount", header: z("金额 PKR", "Amount PKR"), value: (r) => r.amount, className: "text-end", render: (r) => <span className="latin tabular-nums">{n(r.amount)}</span> },
    { key: "mode", header: z("类型", "Type"), value: (r) => (r.mode === "full" ? z("全款", "Full") : z("预付款", "Advance")), defaultHidden: true },
    { key: "customer", header: z("客户", "Customer"), value: (r) => `${r.customer} ${r.phone}`, render: (r) => (<>{r.customer}<span className="latin block text-xs text-ink/45">{r.phone}</span></>) },
    { key: "orders", header: z("订单", "Orders"), value: (r) => r.orders.map((o) => o.id).join(" "), render: (r) => <span className="latin text-xs">{r.orders.map((o) => o.id).join(", ")}</span> },
    { key: "date", header: z("时间", "Date"), value: (r) => r.createdAt, defaultHidden: true, render: (r) => <span className="latin text-ink/55">{new Date(r.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span> },
  ];

  const decide = async (action: "approve" | "reject") => {
    if (!open) return;
    if (await call("/api/admin/payments", { id: open.id, action, note }, "PATCH")) (setOpen(null), setNote(""));
  };

  return (
    <div>
      <PageTitle
        title={k.modules.payments}
        intro={z("客户的每一次付款尝试：钱包、银行卡和银行转账。转账需要核对回单后确认；确认后订单进入工厂队列并通知客户。卡号永远不会保存，只记录卡类型和后四位。", "Every attempt a customer made to pay: wallets, cards and bank transfers. Transfers wait here until you check the receipt; approving moves the orders into the factory queue and tells the customer. Card numbers are never stored, only the brand and last four digits.")}
      />
      {waiting > 0 && <p className="mb-3 rounded-xl bg-[#3d8bff]/15 px-4 py-2.5 text-sm font-semibold text-[#3d8bff]">{z(`${waiting} 笔银行转账待审核`, `${waiting} bank transfer${waiting > 1 ? "s" : ""} waiting for your check`)}</p>}
      <DataTable
        id="payments"
        rows={rows}
        rowId={(r) => r.id}
        columns={cols}
        defaultSort={{ key: "date", dir: "desc" }}
        onRow={(r) => (setOpen(r), setNote(""))}
        filters={[
          { key: "status", label: z("状态", "Status"), options: (Object.keys(ST) as PayStatus[]).map((s) => ({ value: s, label: ST[s] })), value: (r) => r.status },
          { key: "method", label: z("方式", "Method"), options: (Object.keys(METHOD) as PayMethod[]).map((s) => ({ value: s, label: METHOD[s] })), value: (r) => r.method },
        ]}
        exportBase={can("payments.export") ? "/api/admin/payments/export" : undefined}
      />

      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? `${open.ref} · PKR ${n(open.amount)}` : ""} wide>
        {open && (
          <div className="space-y-5 text-sm">
            <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
              <div><dt className="text-xs text-ink/45">{z("客户", "Customer")}</dt><dd>{open.customer} · <span className="latin">{open.phone}</span></dd></div>
              <div><dt className="text-xs text-ink/45">{z("状态", "Status")}</dt><dd><Pill color={COLOR[open.status]}>{ST[open.status]}</Pill></dd></div>
              <div><dt className="text-xs text-ink/45">{z("方式", "Method")}</dt><dd>{METHOD[open.method]} · {channelText(open)}</dd></div>
              <div><dt className="text-xs text-ink/45">{z("类型", "Type")}</dt><dd>{open.mode === "full" ? z("全款", "Full amount") : z("预付款", "Advance")}</dd></div>
              <div className="sm:col-span-2"><dt className="text-xs text-ink/45">{z("订单", "Orders")}</dt><dd className="latin">{open.orders.map((o) => `${o.id} (${o.model})`).join(", ")}</dd></div>
              {open.reviewedBy && <div className="sm:col-span-2"><dt className="text-xs text-ink/45">{z("审核", "Reviewed")}</dt><dd>{open.reviewedBy}{open.reviewNote ? ` · ${open.reviewNote}` : ""}</dd></div>}
            </dl>

            {open.hasReceipt && open.receipt && (
              <div>
                <p className="mb-2 text-xs font-semibold text-ink/60">{z("转账回单", "Transfer receipt")}</p>
                {open.receipt.endsWith(".pdf") ? (
                  <a className="inline-flex rounded-lg border border-ink/15 px-3 py-2 font-semibold underline" href={`/api/receipts/${open.receipt}`} target="_blank" rel="noopener noreferrer">
                    {z("打开 PDF 回单", "Open the PDF receipt")}
                  </a>
                ) : (
                  <a href={`/api/receipts/${open.receipt}`} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/receipts/${open.receipt}`} alt={z("转账回单", "Transfer receipt")} className="max-h-80 rounded-lg border border-ink/10 bg-white object-contain" />
                  </a>
                )}
                <p className="mt-2 text-xs text-ink/50">{z(`请核对：金额 PKR ${n(open.amount)}，备注含 ${open.ref}。`, `Check: the amount is PKR ${n(open.amount)} and the remarks carry ${open.ref}.`)}</p>
              </div>
            )}

            {edit && open.status === "review" && (
              <div className="space-y-3 rounded-xl border border-ink/10 p-4">
                <Field label={z("备注（拒绝时必填，会发给客户）", "Note (required to reject, sent to the customer)")}>
                  <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
                </Field>
                <div className="flex flex-wrap gap-2">
                  <Btn tone="primary" onClick={() => decide("approve")}>{z("确认收款", "Approve: money received")}</Btn>
                  <Btn tone="danger" onClick={() => decide("reject")} disabled={!note.trim()}>{z("拒绝", "Reject")}</Btn>
                </div>
              </div>
            )}

            <ul className="space-y-1 text-xs text-ink/55">
              {open.attempts.map((a, i) => (
                <li key={i}><span className="latin">{new Date(a.at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span> · {a.result}{a.note ? ` · ${a.note}` : ""}</li>
              ))}
            </ul>
          </div>
        )}
      </Modal>
    </div>
  );
}
