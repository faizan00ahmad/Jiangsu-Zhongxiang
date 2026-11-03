// Finds where the bike sits inside each tagged studio photo so the 360° viewer can scale and centre every angle the same way,
// and records each model's backdrop colour so a photo that does not fill the stage blends into it.
// Reads src/lib/spinTags.json, writes src/lib/spinBoxes.json. Run: node "admin pannel/tools/spin-prep.mjs" [--debug <dir>]
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const require = createRequire(path.join(ROOT, "package.json"));
const sharp = require("sharp");
const tags = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "lib", "spinTags.json"), "utf8"));
const debugDir = process.argv.includes("--debug") ? process.argv[process.argv.indexOf("--debug") + 1] : null;
if (debugDir) fs.mkdirSync(debugDir, { recursive: true });

const W = 640;
const boxes = {};
const ar = {};
const bgSum = {};
for (const [slug, frames] of Object.entries(tags)) {
  for (const f of frames) {
    const file = path.join(ROOT, "public", "products", slug, f.file);
    const { data, info } = await sharp(file).flatten({ background: "#ffffff" }).resize(W).grayscale().blur(1.2).raw().toBuffer({ resolveWithObject: true });
    const w = info.width;
    const h = info.height;
    // gradient magnitude: strong edges are the bike; the soft light beams and floor shadows stay below the threshold
    const xs = [];
    const ys = [];
    for (let y = 2; y < h - 2; y++) {
      for (let x = 2; x < w - 2; x++) {
        const gx = data[y * w + x + 1] - data[y * w + x - 1];
        const gy = data[(y + 1) * w + x] - data[(y - 1) * w + x];
        if (gx * gx + gy * gy > 26 * 26) {
          xs.push(x);
          ys.push(y);
        }
      }
    }
    if (xs.length < 200) throw new Error(`no bike found in ${slug}/${f.file}`);
    xs.sort((a, b) => a - b);
    ys.sort((a, b) => a - b);
    const q = (arr, p) => arr[Math.min(arr.length - 1, Math.max(0, Math.floor(arr.length * p)))];
    const box = [q(xs, 0.004) / w, q(ys, 0.004) / h, q(xs, 0.996) / w, q(ys, 0.996) / h].map((v) => Math.round(v * 1000) / 1000);
    boxes[`${slug}/${f.file}`] = box;
    ar[`${slug}/${f.file}`] = Math.round((w / h) * 1000) / 1000;

    // backdrop colour at the left and right edges of the photo
    const tiny = await sharp(file).flatten({ background: "#ffffff" }).resize(100, 56, { fit: "fill" }).removeAlpha().raw().toBuffer();
    const acc = (bgSum[slug] ??= [0, 0, 0, 0]);
    for (let y = 14; y < 42; y++) {
      for (const x of [0, 1, 2, 97, 98, 99]) {
        const o = (y * 100 + x) * 3;
        acc[0] += tiny[o];
        acc[1] += tiny[o + 1];
        acc[2] += tiny[o + 2];
        acc[3] += 1;
      }
    }

    if (debugDir) {
      const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><rect x="${box[0] * w}" y="${box[1] * h}" width="${(box[2] - box[0]) * w}" height="${(box[3] - box[1]) * h}" fill="none" stroke="#ff0044" stroke-width="3"/></svg>`;
      await sharp(file).resize(w).composite([{ input: Buffer.from(svg) }]).jpeg({ quality: 70 }).toFile(path.join(debugDir, `${slug}__${f.file}.jpg`));
    }
  }
}
const hex = (a) => "#" + [0, 1, 2].map((i) => Math.round(a[i] / a[3]).toString(16).padStart(2, "0")).join("");
const bg = Object.fromEntries(Object.entries(bgSum).map(([s, a]) => [s, hex(a)]));
fs.writeFileSync(path.join(ROOT, "src", "lib", "spinBoxes.json"), JSON.stringify({ boxes, ar, bg }, null, 1) + "\n");
console.log(`${Object.keys(boxes).length} frames measured`);
