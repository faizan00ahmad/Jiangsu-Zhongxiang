"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAdmin } from "../AdminProvider";
import { Btn, inputCls } from "../ui";

export type Col<R> = {
  key: string;
  header: string;
  /** Plain value used for sorting, searching and filtering. */
  value?: (r: R) => string | number | boolean | null | undefined;
  render?: (r: R) => React.ReactNode;
  className?: string;
  sortable?: boolean;
  defaultHidden?: boolean;
};
export type TableFilter<R> = { key: string; label: string; options: { value: string; label: string }[]; value: (r: R) => string };
export type BulkAction = { label: string; danger?: boolean; confirm?: boolean; run: (ids: string[]) => Promise<void> | void };

type Prefs = { sort: string | null; dir: "asc" | "desc"; size: number; hidden: string[] };

const SIZES = [10, 25, 50, 100];
const text = (v: unknown) => (v == null ? "" : String(v));

/** Sortable, searchable, filterable table with column chooser, paging, row selection with bulk actions and Excel/CSV export.
 *  Sort order, page size and hidden columns are remembered per table in this browser. */
export default function DataTable<R>({
  id,
  rows,
  rowId,
  columns,
  filters = [],
  toolbar,
  bulk = [],
  exportBase,
  rowHref,
  onRow,
  defaultSort,
  pageSize = 25,
  empty,
}: {
  id: string;
  rows: R[];
  rowId: (r: R) => string;
  columns: Col<R>[];
  filters?: TableFilter<R>[];
  toolbar?: React.ReactNode;
  bulk?: BulkAction[];
  exportBase?: string;
  rowHref?: (r: R) => string;
  onRow?: (r: R) => void;
  defaultSort?: { key: string; dir: "asc" | "desc" };
  pageSize?: number;
  empty?: React.ReactNode;
}) {
  const { k, confirm } = useAdmin();
  const tk = k.table;
  const [q, setQ] = useState("");
  const [fv, setFv] = useState<Record<string, string>>({});
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [colMenu, setColMenu] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>({ sort: defaultSort?.key ?? null, dir: defaultSort?.dir ?? "asc", size: pageSize, hidden: columns.filter((c) => c.defaultHidden).map((c) => c.key) });
  const loaded = useRef(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`zx-table:${id}`);
      if (raw) setPrefs((p) => ({ ...p, ...(JSON.parse(raw) as Partial<Prefs>) })); // eslint-disable-line react-hooks/set-state-in-effect
    } catch {
      // storage blocked: defaults stay
    }
    loaded.current = true;
  }, [id]);
  const save = useCallback(
    (next: Prefs) => {
      setPrefs(next);
      try {
        localStorage.setItem(`zx-table:${id}`, JSON.stringify(next));
      } catch {
        // ignore
      }
    },
    [id],
  );
  useEffect(() => {
    if (!colMenu) return;
    const off = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setColMenu(false);
    document.addEventListener("mousedown", off);
    return () => document.removeEventListener("mousedown", off);
  }, [colMenu]);

  const visible = columns.filter((c) => !prefs.hidden.includes(c.key));
  const result = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = rows.filter((r) => {
      for (const f of filters) if (fv[f.key] && f.value(r) !== fv[f.key]) return false;
      if (!needle) return true;
      return columns.some((c) => text(c.value?.(r)).toLowerCase().includes(needle));
    });
    const col = columns.find((c) => c.key === prefs.sort);
    if (col?.value) {
      const v = col.value;
      const dir = prefs.dir === "asc" ? 1 : -1;
      list = [...list].sort((a, b) => {
        const x = v(a);
        const y = v(b);
        if (typeof x === "number" && typeof y === "number") return (x - y) * dir;
        return text(x).localeCompare(text(y), undefined, { numeric: true, sensitivity: "base" }) * dir;
      });
    }
    return list;
  }, [rows, q, fv, prefs.sort, prefs.dir, columns, filters]);

  const pages = Math.max(1, Math.ceil(result.length / prefs.size));
  const cur = Math.min(page, pages - 1);
  const slice = result.slice(cur * prefs.size, cur * prefs.size + prefs.size);
  const ids = slice.map(rowId);
  const allOn = ids.length > 0 && ids.every((i) => sel.has(i));
  const filtered = !!q || Object.values(fv).some(Boolean);
  const toggleSort = (c: Col<R>) => {
    if (!c.value || c.sortable === false) return;
    save({ ...prefs, sort: c.key, dir: prefs.sort === c.key && prefs.dir === "asc" ? "desc" : "asc" });
  };
  const live = [...sel].filter((i) => rows.some((r) => rowId(r) === i));

  return (
    <div className="rounded-2xl border border-ink/10 bg-card/70">
      <div className="flex flex-wrap items-center gap-2 border-b border-ink/10 p-3">
        <input value={q} onChange={(e) => (setQ(e.target.value), setPage(0))} placeholder={tk.search} aria-label={tk.search} className={`${inputCls} !w-auto min-w-[10rem] flex-1 sm:max-w-xs`} />
        {filters.map((f) => (
          <select key={f.key} value={fv[f.key] ?? ""} onChange={(e) => (setFv({ ...fv, [f.key]: e.target.value }), setPage(0))} aria-label={f.label} className={`${inputCls} !w-auto`}>
            <option value="">
              {f.label}: {tk.all}
            </option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ))}
        {filtered && (
          <Btn tone="ghost" onClick={() => (setQ(""), setFv({}), setPage(0))}>
            {tk.reset}
          </Btn>
        )}
        <div className="ms-auto flex flex-wrap items-center gap-2">
          {toolbar}
          <div className="relative" ref={menuRef}>
            <Btn onClick={() => setColMenu((v) => !v)} aria-expanded={colMenu}>
              {tk.columns}
            </Btn>
            {colMenu && (
              <div className="absolute end-0 top-full z-30 mt-1 w-52 rounded-xl border border-ink/12 bg-card p-2 shadow-xl">
                {columns.map((c) => (
                  <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-ink/[0.06]">
                    <input type="checkbox" checked={!prefs.hidden.includes(c.key)} onChange={(e) => save({ ...prefs, hidden: e.target.checked ? prefs.hidden.filter((h) => h !== c.key) : [...prefs.hidden, c.key] })} />
                    {c.header || c.key}
                  </label>
                ))}
              </div>
            )}
          </div>
          {exportBase && (
            <>
              <a href={`${exportBase}?format=xlsx`} className="inline-flex h-9 items-center rounded-lg border border-ink/15 bg-ink/[0.04] px-3.5 text-sm hover:bg-ink/10">
                {tk.exportXlsx}
              </a>
              <a href={`${exportBase}?format=csv`} className="inline-flex h-9 items-center rounded-lg px-3 text-sm text-ink/60 hover:bg-ink/10 hover:text-ink">
                {tk.exportCsv}
              </a>
            </>
          )}
        </div>
      </div>

      {live.length > 0 && bulk.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-ink/10 bg-[var(--volt)]/10 px-3 py-2 text-sm">
          <b>
            {live.length} {tk.selected}
          </b>
          {bulk.map((b) => (
            <Btn
              key={b.label}
              tone={b.danger ? "danger" : "default"}
              onClick={async () => {
                if (b.confirm !== false && !(await confirm(k.form.confirmBulk.replace("{n}", String(live.length)), !!b.danger))) return;
                await b.run(live);
                setSel(new Set());
              }}
            >
              {b.label}
            </Btn>
          ))}
          <Btn tone="ghost" onClick={() => setSel(new Set())}>
            {tk.clear}
          </Btn>
        </div>
      )}

      <div className="overflow-x-auto" data-lenis-prevent>
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-start text-xs uppercase tracking-wide text-ink/50">
              {bulk.length > 0 && (
                <th className="w-10 px-3 py-2.5">
                  <input type="checkbox" aria-label="select all" checked={allOn} onChange={(e) => setSel(e.target.checked ? new Set([...sel, ...ids]) : new Set([...sel].filter((i) => !ids.includes(i))))} />
                </th>
              )}
              {visible.map((c) => {
                const on = prefs.sort === c.key;
                const can = !!c.value && c.sortable !== false;
                return (
                  <th key={c.key} className={`px-3 py-2.5 text-start font-medium ${c.className ?? ""}`} aria-sort={on ? (prefs.dir === "asc" ? "ascending" : "descending") : undefined}>
                    {can ? (
                      <button onClick={() => toggleSort(c)} className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-ink" title={tk.sortBy}>
                        {c.header}
                        <span className={`text-[10px] ${on ? "text-[var(--volt)]" : "opacity-30"}`}>{on ? (prefs.dir === "asc" ? "▲" : "▼") : "↕"}</span>
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {slice.map((r) => {
              const rid = rowId(r);
              const go = rowHref?.(r);
              return (
                <tr key={rid} onClick={onRow ? () => onRow(r) : undefined} className={`border-b border-ink/[0.07] last:border-0 ${onRow ? "cursor-pointer hover:bg-ink/[0.04]" : ""} ${sel.has(rid) ? "bg-[var(--volt)]/[0.06]" : ""}`}>
                  {bulk.length > 0 && (
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" aria-label="select row" checked={sel.has(rid)} onChange={(e) => setSel(new Set(e.target.checked ? [...sel, rid] : [...sel].filter((i) => i !== rid)))} />
                    </td>
                  )}
                  {visible.map((c, i) => (
                    <td key={c.key} className={`px-3 py-2.5 align-middle ${c.className ?? ""}`}>
                      {i === 0 && go ? (
                        <Link href={go} className="font-medium text-ink hover:text-[var(--volt)]">
                          {c.render ? c.render(r) : text(c.value?.(r))}
                        </Link>
                      ) : c.render ? (
                        c.render(r)
                      ) : (
                        text(c.value?.(r))
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
            {!slice.length && (
              <tr>
                <td colSpan={visible.length + (bulk.length ? 1 : 0)} className="px-3 py-12 text-center text-ink/50">
                  {filtered ? tk.emptyFiltered : (empty ?? tk.empty)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 px-3 py-2.5 text-xs text-ink/55">
        <span>
          {result.length} {tk.rows}
          {result.length !== rows.length && ` ${tk.of} ${rows.length}`}
        </span>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5">
            {tk.perPage}
            <select value={prefs.size} onChange={(e) => (save({ ...prefs, size: Number(e.target.value) }), setPage(0))} className="rounded-md border border-ink/12 bg-field px-1.5 py-1">
              {SIZES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <Btn tone="ghost" disabled={cur === 0} onClick={() => setPage(cur - 1)} aria-label={tk.prev}>
            ‹
          </Btn>
          <span>
            {cur + 1} / {pages}
          </span>
          <Btn tone="ghost" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)} aria-label={tk.next}>
            ›
          </Btn>
        </div>
      </div>
    </div>
  );
}
