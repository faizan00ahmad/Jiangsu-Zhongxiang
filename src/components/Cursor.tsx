"use client";
import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

/** Dot + trailing ring cursor. Grows over links/buttons, shows a label over [data-cursor]. */
export default function Cursor() {
  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState<"idle" | "link" | "label">("idle");
  const [label, setLabel] = useState("");
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const rx = useSpring(x, { stiffness: 220, damping: 22, mass: 0.4 });
  const ry = useSpring(y, { stiffness: 220, damping: 22, mass: 0.4 });

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine) return;
    document.documentElement.classList.add("has-cursor");
    const move = (e: MouseEvent) => {
      setEnabled(true);
      x.set(e.clientX);
      y.set(e.clientY);
      const t = e.target as HTMLElement | null;
      const tagged = t?.closest<HTMLElement>("[data-cursor]");
      if (tagged) {
        setMode("label");
        setLabel(tagged.dataset.cursor ?? "");
      } else if (t?.closest("a,button,input,textarea,select,summary,label,[data-magnetic]")) setMode("link");
      else setMode("idle");
    };
    window.addEventListener("mousemove", move);
    return () => {
      window.removeEventListener("mousemove", move);
      document.documentElement.classList.remove("has-cursor");
    };
  }, [x, y]);

  if (!enabled) return null;
  const size = mode === "idle" ? 36 : mode === "link" ? 60 : 96;
  return (
    <>
      <motion.div className="pointer-events-none fixed left-0 top-0 z-[300] h-2 w-2 rounded-full bg-white mix-blend-difference" style={{ x, y, translateX: "-50%", translateY: "-50%" }} />
      <motion.div
        className="pointer-events-none fixed left-0 top-0 z-[299] flex items-center justify-center rounded-full border border-white/60 text-center text-[10px] font-semibold uppercase leading-tight tracking-widest text-black"
        style={{ x: rx, y: ry, translateX: "-50%", translateY: "-50%" }}
        animate={{ width: size, height: size, backgroundColor: mode === "label" ? "rgba(255,255,255,0.92)" : mode === "link" ? "rgba(46,230,166,0.18)" : "rgba(255,255,255,0)" }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
      >
        {mode === "label" && label}
      </motion.div>
    </>
  );
}
