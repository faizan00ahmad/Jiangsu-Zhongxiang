const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));

function parse(hex: string) {
  const h = hex.replace("#", "");
  const f = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "0");
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16) || 0);
}
const hex = (rgb: number[]) => "#" + rgb.map((v) => clamp(v).toString(16).padStart(2, "0")).join("");

/** amt > 0 lightens toward white, < 0 darkens toward black. */
export function shade(color: string, amt: number) {
  const rgb = parse(color);
  return hex(rgb.map((v) => (amt >= 0 ? v + (255 - v) * amt : v * (1 + amt))));
}

export function luminance(color: string) {
  const [r, g, b] = parse(color).map((v) => v / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
