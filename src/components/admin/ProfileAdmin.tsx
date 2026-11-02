"use client";
import { useState } from "react";
import { useAdmin } from "./AdminProvider";
import { Btn, Card, Field, PageTitle, inputCls } from "./ui";

export default function ProfileAdmin({ lastLogin }: { lastLogin: string | null }) {
  const { k, lang, me, call } = useAdmin();
  const [name, setName] = useState(me?.name ?? "");
  const [pw, setPw] = useState({ current: "", next: "", again: "" });
  const mismatch = pw.next !== pw.again;
  return (
    <div className="max-w-2xl">
      <PageTitle title={k.shell.profile} intro={`${me?.username} · ${me?.roleName}${lastLogin ? ` · ${lang === "zh" ? "上次登录" : "last sign-in"} ${new Date(lastLogin).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}` : ""}`} />
      <div className="space-y-5">
        <Card title={lang === "zh" ? "基本信息" : "Details"}>
          <Field label={lang === "zh" ? "姓名" : "Name"}>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Btn tone="primary" className="mt-4" disabled={!name.trim() || name === me?.name} onClick={() => call("/api/admin/profile", { name }, "PUT")}>
            {k.form.save}
          </Btn>
        </Card>
        <Card title={k.shell.changePassword}>
          <div className="grid gap-4">
            <Field label={lang === "zh" ? "当前密码" : "Current password"}>
              <input type="password" className={`${inputCls} latin`} value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" />
            </Field>
            <Field label={lang === "zh" ? "新密码（至少8位）" : "New password (8+ characters)"}>
              <input type="password" className={`${inputCls} latin`} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} autoComplete="new-password" />
            </Field>
            <Field label={lang === "zh" ? "再输入一次" : "Repeat new password"} hint={mismatch && pw.again ? (lang === "zh" ? "两次输入不一致" : "The two passwords differ") : undefined}>
              <input type="password" className={`${inputCls} latin`} value={pw.again} onChange={(e) => setPw({ ...pw, again: e.target.value })} autoComplete="new-password" />
            </Field>
          </div>
          <Btn
            tone="primary"
            className="mt-4"
            disabled={!pw.current || pw.next.length < 8 || mismatch}
            onClick={async () => {
              if (await call("/api/admin/profile", { current: pw.current, password: pw.next }, "PUT")) setPw({ current: "", next: "", again: "" });
            }}
          >
            {k.form.save}
          </Btn>
        </Card>
      </div>
    </div>
  );
}
