"use client";
import { useState } from "react";
import { ACTIONS, GROUPS, MODULES } from "@/lib/perms";
import type { Role } from "@/lib/types";
import { useAdmin } from "./AdminProvider";
import Modal from "./kit/Modal";
import { Btn, Card, Field, PageTitle, Pill, inputCls } from "./ui";

/** Roles on the left, a module × action grid on the right. Super admin is fixed; the other built-ins and your own roles are editable. */
export default function RolesAdmin({ roles, usage }: { roles: Role[]; usage: Record<string, number> }) {
  const { k, lang, call, can, confirm } = useAdmin();
  const [sel, setSel] = useState(roles.find((r) => r.id === "operator")?.id ?? roles[0].id);
  const role = roles.find((r) => r.id === sel) ?? roles[0];
  const [draft, setDraft] = useState<Record<string, string[]>>({});
  const perms = draft[role.id] ?? role.perms;
  const locked = role.id === "super" || !can("roles.edit");
  const dirty = JSON.stringify([...perms].sort()) !== JSON.stringify([...role.perms].sort());
  const [open, setOpen] = useState<null | { en: string; ur: string; scope: "all" | "dealer" }>(null);

  const set = (next: string[]) => setDraft({ ...draft, [role.id]: next });
  const toggle = (p: string) => {
    if (locked) return;
    const on = perms.includes(p);
    const [mod, act] = p.split(".");
    let next = on ? perms.filter((x) => x !== p) : [...perms, p];
    if (on && act === "view") next = next.filter((x) => !x.startsWith(`${mod}.`)); // no view, no anything
    if (!on && act !== "view" && !next.includes(`${mod}.view`)) next.push(`${mod}.view`);
    set(next);
  };
  const toggleModule = (mod: string) => {
    if (locked) return;
    const all = ACTIONS.map((a) => `${mod}.${a}`);
    set(all.every((p) => perms.includes(p)) ? perms.filter((p) => !all.includes(p)) : [...new Set([...perms, ...all])]);
  };

  return (
    <div>
      <PageTitle
        title={k.modules.roles}
        intro={lang === "zh" ? "为每个角色勾选可使用的功能与操作。经销商角色只看自己门店的订单与库存。" : "Choose which screens and actions each role gets. Dealer-scoped roles only ever see their own store's orders and stock."}
        actions={
          can("roles.create") && (
            <Btn tone="primary" onClick={() => setOpen({ en: "", ur: "", scope: "all" })}>
              + {k.form.new}
            </Btn>
          )
        }
      />
      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        <Card>
          <ul className="space-y-1">
            {roles.map((r) => (
              <li key={r.id}>
                <button onClick={() => setSel(r.id)} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-start text-sm ${r.id === sel ? "bg-ink/10 font-semibold" : "hover:bg-ink/[0.06]"}`}>
                  <span>{r.name.en}</span>
                  <span className="text-xs text-ink/45">{usage[r.id] ?? 0}</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
        <Card
          title={role.name.en}
          sub={`${role.scope === "dealer" ? (lang === "zh" ? "仅限本门店数据" : "Own store only") : lang === "zh" ? "全部数据" : "All data"} · ${perms.length} ${lang === "zh" ? "项权限" : "permissions"}`}
          actions={
            <div className="flex gap-2">
              {role.builtin && <Pill color="#8b93a3">{lang === "zh" ? "内置" : "Built-in"}</Pill>}
              {!role.builtin && can("roles.delete") && (
                <Btn
                  tone="danger"
                  onClick={async () => {
                    if (await confirm(k.form.confirmDelete)) {
                      if (await call("/api/admin/roles", { id: role.id }, "DELETE")) setSel("operator");
                    }
                  }}
                >
                  {k.form.delete}
                </Btn>
              )}
              {!locked && (
                <Btn tone="primary" disabled={!dirty} onClick={async () => void ((await call("/api/admin/roles", { id: role.id, name: role.name, scope: role.scope, perms }, "PUT")) && setDraft({}))}>
                  {k.form.save}
                </Btn>
              )}
            </div>
          }
        >
          {role.id === "super" && <p className="mb-3 rounded-lg bg-ink/[0.05] p-3 text-xs text-ink/60">{lang === "zh" ? "超级管理员始终拥有全部权限，无法修改。" : "Super admin always has every permission and can't be changed."}</p>}
          <div className="overflow-x-auto" data-lenis-prevent>
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="text-xs text-ink/50">
                  <th className="py-2 text-start font-medium" />
                  {ACTIONS.map((a) => (
                    <th key={a} className="w-20 py-2 text-center font-medium">
                      {k.actions[a]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {GROUPS.map((g) => {
                  const mods = MODULES.filter((m) => m.group === g);
                  if (!mods.length) return null;
                  return [
                    <tr key={g}>
                      <td colSpan={ACTIONS.length + 1} className="pt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/35">
                        {k.groups[g]}
                      </td>
                    </tr>,
                    ...mods.map((m) => (
                      <tr key={m.key} className="border-t border-ink/[0.07]">
                        <td className="py-1.5">
                          <button onClick={() => toggleModule(m.key)} className="text-start hover:text-[var(--volt)]" disabled={locked}>
                            {k.modules[m.key]}
                          </button>
                        </td>
                        {ACTIONS.map((a) => {
                          const p = `${m.key}.${a}`;
                          return (
                            <td key={a} className="py-1.5 text-center">
                              <input type="checkbox" aria-label={`${k.modules[m.key]} ${k.actions[a]}`} checked={perms.includes(p)} disabled={locked} onChange={() => toggle(p)} className="h-4 w-4 accent-[var(--volt)]" />
                            </td>
                          );
                        })}
                      </tr>
                    )),
                  ];
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      <Modal
        open={!!open}
        onClose={() => setOpen(null)}
        title={`${k.form.new} · ${k.modules.roles}`}
        footer={
          <>
            <Btn onClick={() => setOpen(null)}>{k.form.cancel}</Btn>
            <Btn
              tone="primary"
              onClick={async () => {
                if (open && (await call("/api/admin/roles", { name: { en: open.en, ur: open.ur }, scope: open.scope, perms: ["dashboard.view"] }))) setOpen(null);
              }}
            >
              {k.form.create}
            </Btn>
          </>
        }
      >
        {open && (
          <div className="grid gap-4">
            <Field label={`${k.form.english} *`}>
              <input className={`${inputCls} latin`} value={open.en} onChange={(e) => setOpen({ ...open, en: e.target.value })} />
            </Field>
            <Field label={k.form.urdu}>
              <input className={inputCls} dir="rtl" value={open.ur} onChange={(e) => setOpen({ ...open, ur: e.target.value })} />
            </Field>
            <Field label={lang === "zh" ? "数据范围" : "Data scope"}>
              <select className={inputCls} value={open.scope} onChange={(e) => setOpen({ ...open, scope: e.target.value as "all" | "dealer" })}>
                <option value="all">{lang === "zh" ? "全部数据" : "All data"}</option>
                <option value="dealer">{lang === "zh" ? "仅本门店" : "Own store only"}</option>
              </select>
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
