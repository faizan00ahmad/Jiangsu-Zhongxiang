"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { analyse, recolor } from "@/lib/recolor";

/** A product photo painted in `color` (null = untouched). The plain <img> stays underneath, so it renders without
 *  JavaScript and while the recolour is being prepared. `onAnalysis(false)` means the photo has no clear body paint. */
export default function RecolorImage({ src, color, alt, className = "", imgClassName = "", onAnalysis }: { src: string; color: string | null; alt: string; className?: string; imgClassName?: string; onAnalysis?: (recolorable: boolean) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const cb = useRef(onAnalysis);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    cb.current = onAnalysis;
  });
  useEffect(() => {
    let alive = true;
    analyse(src)
      .then((an) => {
        if (!alive) return;
        cb.current?.(an.ok);
        const cv = canvas.current;
        if (!cv) return;
        cv.width = an.w;
        cv.height = an.h;
        const ctx = cv.getContext("2d");
        if (!ctx) return;
        ctx.putImageData(color && an.ok ? recolor(an, color) : new ImageData(new Uint8ClampedArray(an.data), an.w, an.h), 0, 0);
        setReady(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [src, color]);

  return (
    <motion.span key={color ?? "std"} initial={{ opacity: 0.55, scale: 0.985 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.45 }} className={`relative inline-block max-w-full ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} draggable={false} className={`block h-auto w-full object-contain mix-blend-multiply ${ready ? "opacity-0" : ""} ${imgClassName}`} />
      <canvas ref={canvas} aria-hidden className="absolute inset-0 h-full w-full object-contain mix-blend-multiply" />
    </motion.span>
  );
}
