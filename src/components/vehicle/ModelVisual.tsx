"use client";
import { KIND_META } from "@/lib/catalog";
import type { Model } from "@/lib/types";
import Vehicle from "./Vehicle";

export type VisualModel = Pick<Model, "kind" | "variant" | "name" | "image" | "photos" | "colors">;

/** The best real picture we have for a model:
 *  1. the studio photo of the chosen paint (full scene) when `colorId` is given,
 *  2. a photo uploaded in the admin, 3. the factory catalogue cut-out,
 *  4. the vector render (the only option that can repaint to any colour). */
export function photoFor(model: VisualModel, colorId?: string) {
  const paint = colorId ? model.colors?.find((c) => c.id === colorId && c.image) : undefined;
  if (paint?.image) return { src: paint.image, scene: true };
  const src = model.image ?? model.photos?.thumb ?? null;
  return src ? { src, scene: false } : null;
}

export default function ModelVisual({
  model,
  color,
  colorId,
  wheel,
  rollKey,
  reflection = true,
  className = "",
  photo = true,
}: {
  model: VisualModel;
  color: string;
  colorId?: string;
  wheel?: string;
  rollKey?: string | number;
  reflection?: boolean;
  className?: string;
  photo?: boolean;
}) {
  const p = photo ? photoFor(model, colorId) : null;
  if (p) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={p.src}
        alt={model.name}
        loading="lazy"
        draggable={false}
        className={`${p.scene ? "rounded-[inherit] object-cover" : "object-contain mix-blend-multiply"} ${className}`}
      />
    );
  }
  return <Vehicle kind={model.kind} variant={model.variant} color={color} wheel={wheel} accent={KIND_META[model.kind].accent} rollKey={rollKey} reflection={reflection} className={className} title={model.name} />;
}
