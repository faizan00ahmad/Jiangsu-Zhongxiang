import type { ReactNode } from "react";

/** Tiny safe Markdown: headings (#, ##, ###), bullet and numbered lists, **bold**, *italic*, [links](url) and paragraphs.
 *  It builds React elements, never HTML strings, so pasted content cannot inject markup. */

const safeHref = (h: string) => (/^(\/(?![/\\])|https?:\/\/|mailto:|tel:)/i.test(h) ? h : "#");

function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|\[[^\]]+\]\([^)\s]+\))/g;
  let last = 0;
  let n = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const k = `${key}-${n++}`;
    if (tok.startsWith("**")) out.push(<strong key={k}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("[")) {
      const [, label, href] = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(tok)!;
      out.push(
        <a key={k} href={safeHref(href)} className="underline underline-offset-2" rel="noopener noreferrer" {...(href.startsWith("http") ? { target: "_blank" } : {})}>
          {label}
        </a>,
      );
    } else out.push(<em key={k}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ text, className = "" }: { text: string; className?: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.replace(/\r/g, "").split("\n");
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      const cls = level === 1 ? "mt-8 text-2xl font-bold" : level === 2 ? "mt-7 text-xl font-semibold" : "mt-5 text-lg font-semibold";
      const Tag = (`h${level + 1}` as "h2" | "h3" | "h4");
      blocks.push(
        <Tag key={key++} className={cls}>
          {inline(h[2], `h${key}`)}
        </Tag>,
      );
      i++;
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*([-*]|\d+\.)\s+/, ""));
      const List = ordered ? "ol" : "ul";
      blocks.push(
        <List key={key++} className={`mt-3 space-y-1 ps-6 ${ordered ? "list-decimal" : "list-disc"}`}>
          {items.map((it, j) => (
            <li key={j}>{inline(it, `l${key}-${j}`)}</li>
          ))}
        </List>,
      );
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,3})\s+/.test(lines[i]) && !/^\s*([-*]|\d+\.)\s+/.test(lines[i])) para.push(lines[i++]);
    blocks.push(
      <p key={key++} className="mt-3 leading-relaxed">
        {para.flatMap((p, j) => (j ? [<br key={`b${j}`} />, ...inline(p, `p${key}-${j}`)] : inline(p, `p${key}-${j}`)))}
      </p>,
    );
  }
  return <div className={className}>{blocks}</div>;
}

/** Plain text for meta descriptions: Markdown marks removed, cut to `max` characters. */
export function plain(text: string, max = 160) {
  const s = text.replace(/\r/g, "").replace(/[#*_`>]/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}
