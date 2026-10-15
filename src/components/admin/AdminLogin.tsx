"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { api } from "@/lib/client";
import Logo from "@/components/Logo";
import { useAdmin } from "./AdminProvider";
import AdminLangSwitch from "./AdminLangSwitch";
import { Btn, Field, inputCls } from "./ui";

export default function AdminLogin() {
  const { t, err } = useAdmin();
  const router = useRouter();
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [e, setE] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="relative isolate grid min-h-screen place-items-center px-5">
      <div className="aurora -z-10">
        <i />
        <i />
        <i />
      </div>
      <div className="grid-bg absolute inset-0 -z-10 opacity-60" />
      <div className="absolute end-5 top-5">
        <AdminLangSwitch />
      </div>
      <motion.form
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={async (ev) => {
          ev.preventDefault();
          setBusy(true);
          setE("");
          const r = await api("/api/admin/login", { username: u, password: p });
          if (!r.ok) {
            setBusy(false);
            return setE(err(r.error));
          }
          router.replace("/admin");
          router.refresh();
        }}
        className="glass w-full max-w-sm rounded-3xl p-8"
      >
        <Logo size="lg" />
        <h1 className="mt-6 text-2xl font-bold">{t.login.title}</h1>
        <p className="mt-1 text-sm text-ink/55">{t.login.sub}</p>
        <div className="mt-6 space-y-4">
          <Field label={t.login.username}>
            <input className={inputCls} value={u} onChange={(e) => setU(e.target.value)} autoComplete="username" required />
          </Field>
          <Field label={t.login.password}>
            <input className={inputCls} type="password" value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password" required />
          </Field>
        </div>
        {e && <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{e}</p>}
        <Btn tone="primary" disabled={busy} className="mt-6 h-11 w-full">
          {busy ? t.login.working : t.login.submit}
        </Btn>
      </motion.form>
    </div>
  );
}
