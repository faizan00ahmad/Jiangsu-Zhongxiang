import type { Model } from "./types";
import tags from "./spinTags.json";
import measured from "./spinBoxes.json";

/** One picture of the bike seen from `deg` degrees around it: 0 front, 90 right side, 180 rear, 270 left side. */
export type SpinFrame = {
  src: string;
  deg: number;
  flip: boolean; // the photo is shown mirrored (a bike is the same on both sides, so one side's photo serves the other)
  box: [number, number, number, number] | null; // where the bike sits in the photo (0..1), used to size and centre every angle the same way
  ar: number; // photo width / height
};
export type SpinSet = { frames: SpinFrame[]; bg: string; smooth: boolean };

const TAGS = tags as Record<string, { file: string; deg: number }[]>;
const BOXES = measured.boxes as unknown as Record<string, [number, number, number, number]>;
const AR = measured.ar as Record<string, number>;
const BG = measured.bg as Record<string, string>;

/** Fewer frames than this and the spin is an "angle viewer" (steps between real shots); this many or more is a smooth turntable. */
export const SMOOTH_FROM = 12;
const norm = (d: number) => ((d % 360) + 360) % 360;
export const angleGap = (a: number, b: number) => {
  const d = Math.abs(norm(a) - norm(b));
  return Math.min(d, 360 - d);
};

/** The pictures the 360° viewer turns through for a model, or null when it has none.
 *  A full set uploaded in the admin wins. Otherwise the factory's real angle shots are used, with each one mirrored to fill the other side. */
export function spinFor(m: Pick<Model, "slug" | "spin">): SpinSet | null {
  if (m.spin && m.spin.length >= 2) {
    const n = m.spin.length;
    return { frames: m.spin.map((src, i) => ({ src, deg: (360 / n) * i, flip: false, box: null, ar: 1 })), bg: BG[m.slug] ?? "#e9e9ec", smooth: n >= SMOOTH_FROM };
  }
  const t = TAGS[m.slug];
  if (!t?.length) return null;
  const real: SpinFrame[] = t.map((x) => ({ src: `/products/${m.slug}/${x.file}`, deg: norm(x.deg), flip: false, box: BOXES[`${m.slug}/${x.file}`] ?? null, ar: AR[`${m.slug}/${x.file}`] ?? 16 / 9 }));
  const all = [...real];
  for (const f of real) {
    const deg = norm(360 - f.deg);
    // front and rear are their own mirror image; elsewhere add the opposite side unless a real shot is already close to it
    if (f.deg % 180 !== 0 && !all.some((g) => angleGap(g.deg, deg) < 20)) all.push({ ...f, deg, flip: true });
  }
  return { frames: all.sort((a, b) => a.deg - b.deg), bg: BG[m.slug] ?? "#e9e9ec", smooth: false };
}

/** Which dictionary label to show for an angle. */
export function angleName(deg: number): "front" | "frontRight" | "right" | "rearRight" | "rear" | "rearLeft" | "left" | "frontLeft" {
  const i = Math.round(norm(deg) / 45) % 8;
  return (["front", "frontRight", "right", "rearRight", "rear", "rearLeft", "left", "frontLeft"] as const)[i];
}
