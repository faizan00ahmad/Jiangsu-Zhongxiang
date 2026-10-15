"use client";
import { useState } from "react";
import type { OptionGroup } from "@/lib/types";
import { useAdmin } from "./AdminProvider";
import { Btn, Card, PageTitle, Toggle, inputCls } from "./ui";

export default function OptionsAdmin({ groups }: { groups: OptionGroup[] }) {
  const { t, call } = useAdmin();
  const [g, setG] = useState(() => structuredClone(groups));
  const dirty = JSON.stringify(g) !== JSON.stringify(groups);
  const upd = (gi: number, fn: (x: OptionGroup) => void) =>
    setG((all) => {
      const next = structuredClone(all);
      fn(next[gi]);
      return next;
    });

  return (
    <>
      <PageTitle
        title={t.options.title}
        intro={t.options.intro}
        actions={
          <div className="flex items-center gap-3">
            {dirty && <span className="text-xs text-[var(--amber)]">{t.common.unsaved}</span>}
            <Btn tone="ghost" disabled={!dirty} onClick={() => setG(structuredClone(groups))}>
              {t.common.cancel}
            </Btn>
            <Btn tone="primary" disabled={!dirty} onClick={() => call("/api/admin/options", { groups: g }, "PUT")}>
              {t.common.save}
            </Btn>
          </div>
        }
      />
      <div className="grid gap-5 xl:grid-cols-2">
        {g.map((grp, gi) => (
          <Card key={grp.key} title={`${t.groups[grp.key]} · ${grp.label.en}`} actions={<Toggle on={grp.enabled} onChange={(v) => upd(gi, (x) => (x.enabled = v))} label={t.options.groupOn} />} className={grp.enabled ? "" : "opacity-60"}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="text-start text-xs text-ink/50">
                    <th className="pb-2 text-start font-medium">{t.options.item} · {t.common.en}</th>
                    <th className="pb-2 text-start font-medium">{t.common.ur}</th>
                    {grp.kind === "color" && <th className="pb-2 text-start font-medium">{t.options.hex}</th>}
                    {grp.key === "battery" && <th className="pb-2 text-start font-medium">{t.options.rangeFactor}</th>}
                    <th className="pb-2 text-start font-medium">{t.options.price}</th>
                    <th className="pb-2 text-start font-medium">{t.common.status}</th>
                  </tr>
                </thead>
                <tbody>
                  {grp.items.map((it, ii) => (
                    <tr key={it.id} className="align-middle">
                      <td className="py-1.5 pe-2">
                        <input className={inputCls} value={it.label.en} onChange={(e) => upd(gi, (x) => (x.items[ii].label.en = e.target.value))} />
                      </td>
                      <td className="py-1.5 pe-2">
                        <input className={inputCls} dir="rtl" lang="ur" value={it.label.ur} onChange={(e) => upd(gi, (x) => (x.items[ii].label.ur = e.target.value))} />
                      </td>
                      {grp.kind === "color" && (
                        <td className="py-1.5 pe-2">
                          <input type="color" className="h-9 w-14 cursor-pointer rounded-lg border border-ink/12 bg-transparent" value={it.hex ?? "#888888"} onChange={(e) => upd(gi, (x) => (x.items[ii].hex = e.target.value))} />
                        </td>
                      )}
                      {grp.key === "battery" && (
                        <td className="py-1.5 pe-2">
                          <input className={`${inputCls} w-20`} type="number" step="0.05" min={0.5} max={5} value={it.rangeFactor ?? 1} onChange={(e) => upd(gi, (x) => (x.items[ii].rangeFactor = Number(e.target.value)))} />
                        </td>
                      )}
                      <td className="py-1.5 pe-2">
                        <input className={`${inputCls} w-28 tabular-nums`} type="number" min={0} step={500} value={it.price} onChange={(e) => upd(gi, (x) => (x.items[ii].price = Number(e.target.value)))} />
                      </td>
                      <td className="py-1.5">
                        <Toggle on={it.enabled} onChange={(v) => upd(gi, (x) => (x.items[ii].enabled = v))} label={it.enabled ? t.common.enabled : t.common.disabled} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {grp.kind === "color" && (
              <Btn className="mt-3" onClick={() => upd(gi, (x) => x.items.push({ id: `c${Date.now().toString(36).slice(-5)}`, label: { en: "New colour", ur: "نیا رنگ" }, price: 0, enabled: true, hex: "#888888" }))}>
                + {t.options.addColor}
              </Btn>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}
