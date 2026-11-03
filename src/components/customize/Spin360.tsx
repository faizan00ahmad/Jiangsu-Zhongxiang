"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { angleGap, angleName, type SpinSet } from "@/lib/spin";

const CONTROLS = 96; // px kept free at the bottom for the angle label and buttons
const MAX_W = 0.9;

/** Turn a bike around: drag or swipe, arrow keys, buttons, or let it turn by itself.
 *  With a few real angle shots it steps between them; with a full turntable set it is a smooth flip-book. */
export default function Spin360({ set, name, note }: { set: SpinSet; name: string; note?: string }) {
  const { t } = useI18n();
  const frames = set.frames;
  const n = frames.length;
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [cur, setCur] = useState(0);
  const [prev, setPrev] = useState(-1);
  // this viewer only mounts after a click, so reading the browser setting here cannot disagree with the server render
  const [reduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [playing, setPlaying] = useState(!reduced);
  const [touched, setTouched] = useState(false);
  const drag = useRef<{ x: number; angle: number; moved: boolean } | null>(null);
  const angle = useRef(frames[0]?.deg ?? 0);

  const go = useCallback(
    (i: number) => {
      const next = ((i % n) + n) % n;
      setCur((c) => {
        if (c !== next) setPrev(c);
        return next;
      });
      angle.current = frames[next].deg;
    },
    [frames, n],
  );
  const nearest = useCallback((deg: number) => frames.reduce((best, f, i) => (angleGap(f.deg, deg) < angleGap(frames[best].deg, deg) ? i : best), 0), [frames]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // the frame that was showing stays underneath while the new one fades in, then goes
  useEffect(() => {
    if (prev < 0) return;
    const id = setTimeout(() => setPrev(-1), 300);
    return () => clearTimeout(id);
  }, [prev, cur]);

  // turns by itself until the visitor touches it; people who ask for less motion get it still
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => go(cur + 1), set.smooth ? 70 : 1600);
    return () => clearInterval(id);
  }, [playing, cur, go, set.smooth]);

  // one factor shrinks every angle together if any of them would be wider than the stage, so sizes stay consistent between angles
  const avail = Math.max(120, size.h - CONTROLS - (note ? 18 : 0) - 8); // px the bike may use above the controls
  const targetH = size.h ? (avail * 0.94) / size.h : 0.6; // how tall the bike is, as a share of the stage
  const ground = size.h ? (avail + 4) / size.h : 0.8; // and where its tyres touch
  const fit = useMemo(() => {
    if (!size.w || !size.h) return 1;
    let k = 1;
    for (const f of frames) {
      if (!f.box) continue;
      const bw = f.box[2] - f.box[0];
      const bh = f.box[3] - f.box[1];
      const wide = (MAX_W * size.w) / (bw * (targetH / bh) * f.ar * size.h);
      k = Math.min(k, wide);
    }
    return k;
  }, [frames, size, targetH]);

  function onDown(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, angle: angle.current, moved: false };
    setPlaying(false);
    setTouched(true);
  }
  function onMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 3) d.moved = true;
    // a drag across the stage turns the bike once round
    const deg = d.angle + (dx / Math.max(200, size.w)) * 360;
    const i = nearest(deg);
    setCur((c) => {
      if (c !== i) setPrev(c);
      return i;
    });
  }
  function onUp(e: React.PointerEvent) {
    drag.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    angle.current = frames[cur].deg;
  }
  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      setPlaying(false);
      setTouched(true);
      go(cur + (e.key === "ArrowRight" ? 1 : -1));
    } else if (e.key === " " && e.target === e.currentTarget) {
      e.preventDefault();
      setPlaying((p) => !p);
    }
  }

  const label = t.spin.angles[angleName(frames[cur].deg)];

  return (
    <div className="absolute inset-0 z-[5] select-none" style={{ background: set.bg }}>
      <div
        ref={box}
        role="group"
        aria-roledescription={t.spin.title}
        aria-label={`${name} · ${t.spin.title}`}
        tabIndex={0}
        onKeyDown={onKey}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className="absolute inset-0 cursor-grab overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] active:cursor-grabbing"
        style={{ touchAction: "pan-y" }}
      >
        {frames.map((f, i) => {
          const shown = i === cur;
          const style: React.CSSProperties = { opacity: shown || i === prev ? 1 : 0, zIndex: shown ? 2 : i === prev ? 1 : 0, transition: set.smooth ? "none" : shown ? "opacity 260ms ease" : "opacity 220ms ease 120ms" };
          if (!f.box) {
            // a full turntable frame: already framed by the photographer
            // eslint-disable-next-line @next/next/no-img-element
            return <img key={f.src + i} src={f.src} alt={shown ? `${name} · ${label}` : ""} aria-hidden={!shown} draggable={false} decoding="async" className="absolute inset-0 h-full w-full object-contain" style={style} />;
          }
          const [x0, y0, x1, y1] = f.box;
          const bh = y1 - y0;
          const s = (targetH / bh) * fit;
          const cx = f.flip ? 1 - (x0 + x1) / 2 : (x0 + x1) / 2;
          const feather = (gap: number) => `${Math.round(Math.min(7, Math.max(0, gap - 1)))}%`;
          // the mask belongs to the photo itself, so it is mirrored together with it
          const fx0 = feather(x0 * 100);
          const fx1 = feather((1 - x1) * 100);
          const fy0 = feather(y0 * 100);
          const fy1 = feather((1 - y1) * 100);
          const mask = `linear-gradient(to right, transparent, #000 ${fx0}, #000 calc(100% - ${fx1}), transparent), linear-gradient(to bottom, transparent, #000 ${fy0}, #000 calc(100% - ${fy1}), transparent)`;
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={f.src + i + (f.flip ? "m" : "")}
              src={f.src}
              alt={shown ? `${name} · ${label}` : ""}
              aria-hidden={!shown}
              draggable={false}
              decoding="async"
              className="pointer-events-none absolute max-w-none"
              style={{
                ...style,
                left: "50%",
                top: `${ground * 100}%`,
                height: `${s * 100}%`,
                width: "auto",
                transform: `translate(${-cx * 100}%, ${-y1 * 100}%)${f.flip ? " scaleX(-1)" : ""}`,
                WebkitMaskImage: mask,
                maskImage: mask,
                WebkitMaskComposite: "source-in",
                maskComposite: "intersect",
              }}
            />
          );
        })}
      </div>

      {!touched && !reduced && (
        <p className="pointer-events-none absolute inset-x-0 top-3 z-10 text-center text-xs font-semibold uppercase tracking-[0.25em] text-black/45">{t.spin.hint}</p>
      )}

      <div className="absolute inset-x-0 bottom-3 z-10 flex flex-col items-center gap-2 px-3" dir="ltr">
        <p className="rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-white" aria-live="polite">
          {label}
        </p>
        <div className="flex items-center gap-1.5 rounded-full bg-white/85 px-2 py-1.5 shadow backdrop-blur">
          <button type="button" aria-label={t.spin.prev} onClick={() => { setPlaying(false); setTouched(true); go(cur - 1); }} className="grid h-8 w-8 place-items-center rounded-full text-black hover:bg-black/10">
            ‹
          </button>
          <button type="button" aria-label={playing ? t.spin.pause : t.spin.play} aria-pressed={playing} onClick={() => { setTouched(true); setPlaying((p) => !p); }} className="grid h-8 min-w-8 place-items-center rounded-full px-2 text-[11px] font-bold text-black hover:bg-black/10">
            {playing ? "❚❚" : "▶"}
          </button>
          <div className="flex items-center gap-1 px-1">
            {frames.length <= 16 ? (
              frames.map((f, i) => (
                <button key={i} type="button" aria-label={t.spin.angles[angleName(f.deg)]} aria-current={i === cur} onClick={() => { setPlaying(false); setTouched(true); go(i); }} className={`h-2 rounded-full transition-all ${i === cur ? "w-5 bg-black" : "w-2 bg-black/30 hover:bg-black/60"}`} />
              ))
            ) : (
              <span className="latin px-1 text-[11px] font-semibold tabular-nums text-black/70">{Math.round(frames[cur].deg)}°</span>
            )}
          </div>
          <button type="button" aria-label={t.spin.next} onClick={() => { setPlaying(false); setTouched(true); go(cur + 1); }} className="grid h-8 w-8 place-items-center rounded-full text-black hover:bg-black/10">
            ›
          </button>
        </div>
        {note && <p className="max-w-md text-center text-[11px] text-black/55">{note}</p>}
      </div>
    </div>
  );
}
