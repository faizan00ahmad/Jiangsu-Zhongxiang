"use client";
import { motion, useScroll, useSpring } from "framer-motion";

export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 24 });
  return <motion.div aria-hidden className="fixed inset-x-0 top-0 z-[120] h-[3px] origin-left bg-gradient-to-r from-[var(--volt)] via-[#9ff7d6] to-[var(--blue)] rtl:origin-right no-print" style={{ scaleX }} />;
}
