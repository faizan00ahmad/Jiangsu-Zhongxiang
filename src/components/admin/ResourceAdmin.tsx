"use client";
import { useMemo, useState } from "react";
import { RESOURCE, get, type Field, type Opt, type Resource } from "@/lib/admin/resources";
import type { L } from "@/lib/types";
import { useAdmin } from "./AdminProvider";
import DataTable, { type BulkAction, type Col, type TableFilter } from "./kit/DataTable";
import { FieldInput } from "./kit/Fields";
import Modal from "./kit/Modal";
import { Btn, Field as Label, PageTitle, Pill } from "./ui";

type Doc = Record<string, unknown>;

const TONES = ["#2ee6a6", "#3d8bff", "#f5b40c", "#ff4d3d", "#a78bfa", "#8b93a3", "#14b8a6"];
const tone = (s: string) => TONES[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % TONES.length];
const FIXED_TONE: Record<string, string> = { reviewing: "#f5b40c", agent: "#3d8bff", distributor: "#a78bfa", affiliate: "#14b8a6", approved: "#2ee6a6", published: "#2ee6a6", closed: "#8b93a3", pending: "#f5b40c", draft: "#8b93a3", new: "#3d8bff", open: "#f5b40c", rejected: "#ff4d3d", sandbox: "#f5b40c", sent: "#2ee6a6", failed: "#ff4d3d" };

const defaults = (res: Resource): Doc => Object.fromEntries(res.fields.filter((f) => !f.readOnly).map((f) => [f.key, f.def ?? (f.type === "lang" || f.type === "langarea" || f.type === "markdown" ? { en: "", ur: "" } : f.type === "multiselect" || f.type === "tags" ? [] : f.type === "bool" ? false : f.type === "number" ? 0 : f.type === "seo" ? null : "")]));

function Cell({ f, doc, opts }: { f: Field; doc: Doc; opts: Opt[] }) {
  const { lang, k } = useAdmin();
  const v = get(doc, f.key);
  switch (f.col) {
    case "badge": {
      const s = String(v ?? "");
      const label = opts.find((o) => o.value === s)?.label[lang] ?? s;
      return s ? <Pill color={FIXED_TONE[s] ?? tone(s)}>{label}</Pill> : null;
    }
    case "image":
      // eslint-disable-next-line @next/next/no-img-element
      return v ? <img src={String(v)} alt="" className="h-9 w-14 rounded-md object-cover" /> : <span className="text-ink/30">—</span>;
    case "lang":
      return <span className="font-medium">{String((v as L | undefined)?.en ?? "")}</span>;
    case "money":
      return <span className="latin">PKR {Number(v ?? 0).toLocaleString("en-US")}</span>;
    case "date":
      return v ? <span className="latin whitespace-nowrap text-ink/70">{new Date(String(v)).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span> : <span className="text-ink/30">—</span>;
    case "bool":
      return <Pill color={v ? "#2ee6a6" : "#8b93a3"}>{v ? k.status.on : k.status.off}</Pill>;
    case "number":
      return <span className="latin">{Number(v ?? 0).toLocaleString("en-US")}</span>;
    default:
      return <span className="latin">{String(v ?? "")}</span>;
  }
}

/** One screen for any collection in lib/admin/resources.ts: table with search, filters, sort, bulk actions, export, and a create/edit dialog. */
export default function ResourceAdmin({ resKey, items, lookups, extra }: { resKey: string; items: Doc[]; lookups: Record<string, Opt[]>; extra?: React.ReactNode }) {
  const res = RESOURCE[resKey];
  const { lang, k, call, can, confirm } = useAdmin();
  const [open, setOpen] = useState<null | { id: string | null; draft: Doc }>(null);
  const [busy, setBusy] = useState(false);
  const mod = res.module;
  const mayCreate = res.canCreate && can(`${mod}.create`);
  const mayEdit = can(`${mod}.edit`);
  const mayDelete = res.canDelete && can(`${mod}.delete`);
  const editable = res.fields.some((f) => !f.readOnly);
  const optsOf = (f: Field): Opt[] => (typeof f.options === "string" ? (lookups[f.options] ?? []) : (f.options ?? []));

  const columns: Col<Doc>[] = useMemo(
    () =>
      res.fields
        .filter((f) => f.col)
        .map((f) => ({
          key: f.key,
          header: f.label[lang],
          value: (d: Doc) => {
            const v = get(d, f.key);
            if (f.type === "lang") return String((v as L | undefined)?.en ?? "");
            if (f.type === "bool") return v ? 1 : 0;
            if (f.type === "image") return v ? 1 : 0;
            if (f.options && f.col === "badge") return String(optsOf(f).find((o) => o.value === String(v))?.label[lang] ?? v ?? "");
            return typeof v === "number" ? v : String(v ?? "");
          },
          render: (d: Doc) => <Cell f={f} doc={d} opts={optsOf(f)} />,
        })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [res, lang, lookups],
  );
  const filters: TableFilter<Doc>[] = res.fields
    .filter((f) => f.filter)
    .map((f) => {
      const o = f.type === "bool" ? [{ value: "true", label: k.status.on }, { value: "false", label: k.status.off }] : f.options ? optsOf(f).map((x) => ({ value: x.value, label: x.label[lang] })) : [...new Set(items.map((d) => String(get(d, f.key) ?? "")).filter(Boolean))].map((v) => ({ value: v, label: v }));
      return { key: f.key, label: f.label[lang], options: o, value: (d: Doc) => String(get(d, f.key) ?? "") };
    });

  const bulk: BulkAction[] = [];
  if (mayEdit) {
    if (res.fields.some((f) => f.key === "enabled"))
      bulk.push({ label: k.table.enable, confirm: false, run: async (ids) => void (await call(`/api/admin/r/${res.key}/bulk`, { action: "enable", ids })) }, { label: k.table.disable, run: async (ids) => void (await call(`/api/admin/r/${res.key}/bulk`, { action: "disable", ids })) });
    const status = res.fields.find((f) => f.key === "status" && !f.readOnly && f.options && typeof f.options !== "string");
    if (status) for (const o of optsOf(status)) bulk.push({ label: `${status.label[lang]} → ${o.label[lang]}`, confirm: false, run: async (ids) => void (await call(`/api/admin/r/${res.key}/bulk`, { action: "set", field: "status", value: o.value, ids })) });
  }
  if (mayDelete) bulk.push({ label: k.table.delete, danger: true, run: async (ids) => void (await call(`/api/admin/r/${res.key}/bulk`, { action: "delete", ids })) });

  const openEdit = (d: Doc) => setOpen({ id: String(d[res.idField]), draft: structuredClone(d) });
  const save = async () => {
    if (!open) return;
    setBusy(true);
    const body = Object.fromEntries(res.fields.filter((f) => !f.readOnly).map((f) => [f.key, open.draft[f.key]]));
    const okay = open.id ? await call(`/api/admin/r/${res.key}/${encodeURIComponent(open.id)}`, body, "PUT") : await call(`/api/admin/r/${res.key}`, body);
    setBusy(false);
    if (okay) setOpen(null);
  };
  const remove = async () => {
    if (!open?.id || !(await confirm(k.form.confirmDelete))) return;
    setBusy(true);
    const okay = await call(`/api/admin/r/${res.key}/${encodeURIComponent(open.id)}`, undefined, "DELETE");
    setBusy(false);
    if (okay) setOpen(null);
  };

  const readOnlyView = !mayEdit || !editable;
  const set = (key: string, v: unknown) => setOpen((o) => (o ? { ...o, draft: { ...o.draft, [key]: v } } : o));

  return (
    <div>
      <PageTitle
        title={res.title[lang]}
        intro={res.intro[lang]}
        actions={
          mayCreate && (
            <Btn tone="primary" onClick={() => setOpen({ id: null, draft: defaults(res) })}>
              + {k.form.new} {res.singular[lang]}
            </Btn>
          )
        }
      />
      {extra}
      <DataTable
        id={`res-${res.key}`}
        rows={items}
        rowId={(d) => String(d[res.idField])}
        columns={columns}
        filters={filters}
        bulk={bulk}
        onRow={openEdit}
        exportBase={can(`${mod}.export`) ? `/api/admin/r/${res.key}/export` : undefined}
        defaultSort={{ key: res.sort.split(".")[0], dir: res.dir ?? "asc" }}
      />
      <Modal
        open={!!open}
        onClose={() => setOpen(null)}
        title={`${open?.id ? k.form.edit : k.form.new} · ${res.singular[lang]}`}
        wide
        footer={
          <>
            {open?.id && mayDelete && (
              <Btn tone="danger" className="me-auto" onClick={remove} disabled={busy}>
                {k.form.delete}
              </Btn>
            )}
            <Btn onClick={() => setOpen(null)}>{k.form.cancel}</Btn>
            {!readOnlyView && (
              <Btn tone="primary" onClick={save} disabled={busy}>
                {open?.id ? k.form.save : k.form.create}
              </Btn>
            )}
          </>
        }
      >
        {open && (
          <div className="grid gap-4 sm:grid-cols-2">
            {res.fields
              .filter((f) => !(f.readOnly && (f.type === "number" || f.type === "bool") && !open.id))
              .filter((f) => !(f.readOnly && !open.id))
              .map((f) => (
                <Label key={f.key} label={`${f.label[lang]}${f.required ? " *" : ""}`} hint={f.help?.[lang]} className={f.full || ["lang", "langarea", "markdown", "seo", "multiselect", "image"].includes(f.type) ? "sm:col-span-2" : ""}>
                  <FieldInput f={{ ...f, readOnly: f.readOnly || readOnlyView }} value={open.draft[f.key]} onChange={(v) => set(f.key, v)} lookups={lookups} />
                </Label>
              ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
