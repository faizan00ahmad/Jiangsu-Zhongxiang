import type { L } from "./types";

/** Nearest friendly name for a factory paint swatch (admins can rename them in both languages). */
const NAMED: [string, L][] = [
  ["#f4f4f4", { en: "Pearl White", ur: "پرل وائٹ" }],
  ["#eae0cf", { en: "Cream", ur: "کریم" }],
  ["#ccc3bc", { en: "Champagne", ur: "شیمپین" }],
  ["#bdbdbd", { en: "Silver", ur: "سلور" }],
  ["#86898f", { en: "Graphite Grey", ur: "گریفائٹ گرے" }],
  ["#59646a", { en: "Slate Grey", ur: "سلیٹ گرے" }],
  ["#151515", { en: "Midnight Black", ur: "مڈنائٹ بلیک" }],
  ["#d8182c", { en: "Racing Red", ur: "ریسنگ ریڈ" }],
  ["#5a0d1b", { en: "Wine Red", ur: "وائن ریڈ" }],
  ["#f57a1a", { en: "Sunset Orange", ur: "سن سیٹ اورنج" }],
  ["#ecaf45", { en: "Amber Gold", ur: "عنبری سنہرا" }],
  ["#e5c161", { en: "Sand Yellow", ur: "ریتیلا پیلا" }],
  ["#a9c38f", { en: "Sage Green", ur: "سیج گرین" }],
  ["#39453b", { en: "Army Green", ur: "آرمی گرین" }],
  ["#315656", { en: "Teal", ur: "ٹیل" }],
  ["#c5d2c8", { en: "Mint Grey", ur: "منٹ گرے" }],
  ["#93d5e0", { en: "Aqua", ur: "ایکوا" }],
  ["#85afcf", { en: "Sky Blue", ur: "اسکائی بلیو" }],
  ["#b8d3e4", { en: "Ice Blue", ur: "آئس بلیو" }],
  ["#4c4c91", { en: "Indigo", ur: "نیلا جامنی" }],
  ["#7c849b", { en: "Steel Blue", ur: "اسٹیل بلیو" }],
  ["#dac4ac", { en: "Latte", ur: "لاٹے" }],
];

const rgb = (h: string) => {
  const x = h.replace("#", "");
  const f = x.length === 3 ? x.split("").map((c) => c + c).join("") : x;
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16));
};

export function colorName(hex: string): L {
  const [r, g, b] = rgb(hex);
  let best = NAMED[0];
  let bd = Infinity;
  for (const n of NAMED) {
    const [R, G, B] = rgb(n[0]);
    const d = (r - R) ** 2 * 0.3 + (g - G) ** 2 * 0.59 + (b - B) ** 2 * 0.11;
    if (d < bd) {
      bd = d;
      best = n;
    }
  }
  return { ...best[1] };
}
