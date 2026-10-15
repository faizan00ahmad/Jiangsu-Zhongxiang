import { Button } from "./ui";

/** Shared empty / not-found / log-in-needed state. Server-safe: callers pass already-translated text. */
export default function EmptyState({ title, text, cta, secondary }: { title: string; text?: string; cta?: { href: string; label: string }; secondary?: { href: string; label: string } }) {
  return (
    <div className="relative isolate mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-6 pt-32 text-center">
      <div className="aurora -z-10">
        <i />
        <i />
        <i />
      </div>
      <span className="mb-6 grid h-16 w-16 place-items-center rounded-2xl border border-ink/15 bg-card/60 text-2xl">⚡</span>
      <h1 className="font-display text-3xl font-semibold md:text-4xl">{title}</h1>
      {text && <p className="mt-3 text-ink/60">{text}</p>}
      {(cta || secondary) && (
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {cta && <Button href={cta.href}>{cta.label}</Button>}
          {secondary && (
            <Button href={secondary.href} variant="ghost" arrow={false}>
              {secondary.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
