/** Client-side recolouring of a product photo.
 *  1. Find the photo's dominant body paint (the most common strongly-saturated hue).
 *  2. Build a soft mask of the pixels that carry it (tyres, seat, chrome, white panels are left alone).
 *  3. For a chosen colour, re-light that colour with the photo's own shading and highlights.
 *  Photos with no clear paint (all grey / white / black) are reported as not recolourable. */

export type Analysis = {
  ok: boolean;
  w: number;
  h: number;
  data: Uint8ClampedArray; // original pixels
  weight: Float32Array; // 0..1 how much each pixel is body paint
  ratio: Float32Array; // pixel luminance / mean paint luminance
};

const MAX_W = 960;
const cache = new Map<string, Promise<Analysis>>();

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function hueOf(r: number, g: number, b: number, max: number, min: number) {
  const d = max - min;
  if (!d) return 0;
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  return h < 0 ? h + 360 : h;
}
const hueDist = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

function load(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error("image failed"));
    img.src = src;
  });
}

export function analyse(src: string): Promise<Analysis> {
  let p = cache.get(src);
  if (!p) {
    p = (async () => {
      const img = await load(src);
      const scale = Math.min(1, MAX_W / img.naturalWidth);
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const cv = document.createElement("canvas");
      cv.width = w;
      cv.height = h;
      const ctx = cv.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;
      const n = w * h;

      // 1. dominant hue among saturated, not-too-dark pixels; muted or dark paints (an olive tank) get a relaxed second pass
      let bins = new Float64Array(36);
      let opaque = 0;
      let chroma = 0;
      let sMin = 0.4;
      let vMin = 0.3;
      // strict → muted/dark (olive) → pale tinted (blue-grey); the first pass that finds enough colour wins
      for (const [sm, vm] of [[0.4, 0.3], [0.27, 0.13], [0.13, 0.2]]) {
        sMin = sm;
        vMin = vm;
        bins = new Float64Array(36);
        opaque = 0;
        chroma = 0;
        for (let p4 = 0; p4 < n * 4; p4 += 4) {
          if (data[p4 + 3] < 20) continue;
          opaque++;
          const r = data[p4], g = data[p4 + 1], b = data[p4 + 2];
          const max = Math.max(r, g, b), min = Math.min(r, g, b);
          const s = max ? (max - min) / max : 0;
          const v = max / 255;
          if (s > sMin && v > vMin) {
            chroma++;
            bins[Math.floor(hueOf(r, g, b, max, min) / 10) % 36] += s * v;
          }
        }
        if (opaque && chroma / opaque >= 0.02) break;
      }
      const empty: Analysis = { ok: false, w, h, data, weight: new Float32Array(0), ratio: new Float32Array(0) };
      if (!opaque || chroma / opaque < 0.02) return empty;
      let best = 0, bestSum = 0;
      for (let b = 0; b < 36; b++) {
        const sum = bins[(b + 35) % 36] + bins[b] + bins[(b + 1) % 36];
        if (sum > bestSum) { bestSum = sum; best = b; }
      }
      const base = best * 10 + 5;

      // 2a. typical saturation of the paint: lets us tell glossy body paint from similar-hued parts (a brown seat is
      //     an orange hue with much lower saturation)
      const sHist = new Uint32Array(51);
      let sTotal = 0;
      for (let p4 = 0; p4 < n * 4; p4 += 4) {
        if (data[p4 + 3] < 20) continue;
        const r = data[p4], g = data[p4 + 1], b = data[p4 + 2];
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        if (!max || max / 255 < vMin * 0.8) continue;
        const s = (max - min) / max;
        if (s < sMin * 0.75 || hueDist(hueOf(r, g, b, max, min), base) > 20) continue;
        sHist[Math.round(s * 50)]++;
        sTotal++;
      }
      let acc = 0, med = 0.8;
      for (let k = 0; k <= 50; k++) {
        acc += sHist[k];
        if (acc >= sTotal / 2) { med = k / 50; break; }
      }

      // 2b. soft mask + mean paint luminance
      const weight = new Float32Array(n);
      const lum = new Float32Array(n);
      let lsum = 0, lcount = 0;
      for (let i = 0, p4 = 0; i < n; i++, p4 += 4) {
        const a = data[p4 + 3];
        const r = data[p4], g = data[p4 + 1], b = data[p4 + 2];
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        const l = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        lum[i] = l;
        if (a < 20 || !max) continue;
        const s = (max - min) / max;
        if (s < sMin * 0.6) continue;
        const hd = hueDist(hueOf(r, g, b, max, min), base);
        // dark, middling-saturation parts (a brown seat) are not paint; bright pixels are paint highlights even when pale
        const v = max / 255;
        const tv = smooth(0.6, 0.88, v);
        const lo = (1 - tv) * 0.72 * med + tv * 0.2;
        const hi = (1 - tv) * 0.92 * med + tv * 0.36;
        const w = (1 - smooth(24, 46, hd)) * smooth(lo, hi, s) * smooth(vMin * 0.55, vMin, v);
        if (w > 0) {
          weight[i] = w;
          if (w > 0.8) { lsum += l; lcount++; }
        }
      }
      if (lcount < 200) return empty;
      const lbase = lsum / lcount || 0.5;
      const ratio = new Float32Array(n);
      for (let i = 0; i < n; i++) if (weight[i] > 0) ratio[i] = Math.min(2, lum[i] / lbase);
      return { ok: true, w, h, data, weight, ratio };
    })();
    cache.set(src, p);
  }
  return p;
}

function parse(hex: string) {
  const h = hex.replace("#", "");
  const f = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "0");
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16) || 0);
}

/** New pixels for the given paint colour. */
export function recolor(an: Analysis, hex: string): ImageData {
  const out = new Uint8ClampedArray(an.data);
  const [tr, tg, tb] = parse(hex);
  const n = an.w * an.h;
  for (let i = 0, p4 = 0; i < n; i++, p4 += 4) {
    const w = an.weight[i];
    if (!w) continue;
    const rr = an.ratio[i];
    const shade = Math.pow(Math.min(rr, 1), 0.82);
    const hi = Math.min(1, Math.max(rr - 1, 0) * 1.15);
    const r = tr * shade, g = tg * shade, b = tb * shade;
    const R = r + (255 - r) * hi, G = g + (255 - g) * hi, B = b + (255 - b) * hi;
    out[p4] = an.data[p4] * (1 - w) + R * w;
    out[p4 + 1] = an.data[p4 + 1] * (1 - w) + G * w;
    out[p4 + 2] = an.data[p4 + 2] * (1 - w) + B * w;
  }
  return new ImageData(out, an.w, an.h);
}
