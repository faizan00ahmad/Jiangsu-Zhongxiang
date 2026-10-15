"use client";
import { useId } from "react";
import { motion } from "framer-motion";
import { luminance, shade } from "@/lib/color";
import type { VehicleKind } from "@/lib/types";

/** Side-view studio render of every model family, repainted live from the configurator.
 *  viewBox 1000×560, ground line at y=472. Vehicles face right in both LTR and RTL. */

export type WheelStyle = "five" | "aero" | "twin" | "ten" | "turbine";

type Ids = { paint: string; paintDark: string; glass: string; rim: string; shadow: string; fade: string; glow: string; group: string };

function Spokes({ style, R, ids }: { style: WheelStyle; R: number; ids: Ids }) {
  const spoke = (w1: number, w2: number) => `M ${-w1 * R} ${-R * 0.2} L ${-w2 * R} ${-R * 0.93} L ${w2 * R} ${-R * 0.93} L ${w1 * R} ${-R * 0.2} Z`;
  if (style === "aero")
    return (
      <g>
        <circle r={R * 0.94} fill={`url(#${ids.rim})`} />
        <circle r={R * 0.72} fill="none" stroke="rgba(0,0,0,0.28)" strokeWidth={R * 0.04} />
        {[0, 60, 120, 180, 240, 300].map((a) => (
          <rect key={a} x={-R * 0.05} y={-R * 0.86} width={R * 0.1} height={R * 0.16} rx={R * 0.04} fill="#0b0c0f" transform={`rotate(${a})`} />
        ))}
      </g>
    );
  if (style === "turbine")
    return (
      <g>
        {Array.from({ length: 9 }, (_, i) => (
          <path key={i} transform={`rotate(${i * 40})`} fill={`url(#${ids.rim})`} d={`M 0 ${-R * 0.18} Q ${R * 0.42} ${-R * 0.5} ${R * 0.24} ${-R * 0.93} L ${R * 0.04} ${-R * 0.93} Q ${R * 0.2} ${-R * 0.52} ${-R * 0.08} ${-R * 0.18} Z`} />
        ))}
      </g>
    );
  const n = style === "ten" ? 10 : 5;
  if (style === "twin")
    return (
      <g>
        {Array.from({ length: 5 }, (_, i) => (
          <g key={i} transform={`rotate(${i * 72})`}>
            <path d={spoke(0.05, 0.05)} transform="rotate(-8)" fill={`url(#${ids.rim})`} />
            <path d={spoke(0.05, 0.05)} transform="rotate(8)" fill={`url(#${ids.rim})`} />
          </g>
        ))}
      </g>
    );
  return (
    <g>
      {Array.from({ length: n }, (_, i) => (
        <path key={i} d={n === 10 ? spoke(0.035, 0.06) : spoke(0.08, 0.16)} transform={`rotate(${(360 / n) * i})`} fill={`url(#${ids.rim})`} />
      ))}
    </g>
  );
}

function Wheel({ cx, cy, r, style, ids, accent, rollKey, ghost = false }: { cx: number; cy: number; r: number; style: WheelStyle; ids: Ids; accent: string; rollKey?: string | number; ghost?: boolean }) {
  const R = r * 0.66;
  return (
    <g transform={`translate(${cx} ${cy})`} opacity={ghost ? 0.45 : 1}>
      <circle r={r} fill="#0b0c0e" />
      <circle r={r * 0.9} fill="none" stroke="#1f2126" strokeWidth={r * 0.05} />
      <path d={`M ${-r * 0.78} ${-r * 0.42} A ${r * 0.9} ${r * 0.9} 0 0 1 ${r * 0.1} ${-r * 0.89}`} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth={r * 0.05} strokeLinecap="round" />
      <circle r={R} fill="#121318" />
      <circle r={R * 0.6} fill="#41454e" stroke="#2a2d34" strokeWidth={R * 0.05} />
      {!ghost && <rect x={R * 0.25} y={-R * 0.72} width={R * 0.3} height={R * 0.42} rx={R * 0.08} fill={accent} transform="rotate(28)" />}
      <motion.g key={rollKey} initial={rollKey !== undefined ? { rotate: -720 } : false} animate={{ rotate: 0 }} transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}>
        <Spokes style={style} R={R} ids={ids} />
        <circle r={R * 0.2} fill="#22252b" stroke={`url(#${ids.rim})`} strokeWidth={R * 0.04} />
        <circle r={R * 0.07} fill={accent} />
      </motion.g>
      <circle r={R} fill="none" stroke={`url(#${ids.rim})`} strokeWidth={R * 0.09} />
    </g>
  );
}

const Light = ({ d, ids, color = "#f6fbff" }: { d: string; ids: Ids; color?: string }) => (
  <g>
    <path d={d} fill={color} filter={`url(#${ids.glow})`} opacity={0.75} />
    <path d={d} fill={color} />
  </g>
);

type PartProps = { ids: Ids; accent: string; wheel: WheelStyle; variant: number; rollKey?: string | number; ink: string; outline: string };

function Commuter({ ids, accent, wheel, variant, rollKey, ink, outline }: PartProps) {
  return (
    <g>
      <Wheel cx={285} cy={400} r={72} style={wheel} ids={ids} accent={accent} rollKey={rollKey} />
      <path d="M 285 388 L 430 360 L 442 382 L 292 414 Z" fill="#23262c" />
      <line x1={706} y1={150} x2={735} y2={400} stroke="#2a2d33" strokeWidth={16} strokeLinecap="round" />
      <Wheel cx={735} cy={400} r={72} style={wheel} ids={ids} accent={accent} rollKey={rollKey} />
      {variant === 1 && (
        <g>
          <rect x={160} y={190} width={118} height={66} rx={16} fill={`url(#${ids.paint})`} stroke={outline} strokeWidth={1.5} />
          <path d="M 166 214 L 272 214" stroke="rgba(0,0,0,0.3)" strokeWidth={3} />
          <path d="M 236 252 L 300 236" stroke="#1a1b1f" strokeWidth={7} strokeLinecap="round" />
        </g>
      )}
      <path
        d="M 160 392 C 148 330 185 266 255 258 L 478 252 C 506 252 522 272 518 298 L 508 362 L 606 362 C 628 330 640 236 650 178 L 664 132 L 704 132 C 712 206 738 268 780 298 C 812 320 830 346 830 376 L 824 392 L 817 392 A 82 82 0 0 0 653 392 L 373 392 A 88 88 0 0 0 197 392 Z"
        fill={`url(#${ids.paint})`}
        stroke={outline}
        strokeWidth={1.5}
      />
      <path d="M 614 360 C 634 328 646 244 657 188 L 668 152 L 686 152 C 682 232 670 312 642 360 Z" fill={`url(#${ids.paintDark})`} />
      <rect x={373} y={376} width={280} height={16} fill="#101216" />
      <rect x={390} y={381} width={150} height={3} rx={1.5} fill={accent} opacity={0.9} />
      <rect x={520} y={355} width={86} height={8} rx={3} fill="#15161a" />
      <path d="M 262 258 C 300 226 440 224 488 250 L 482 262 C 430 252 320 254 262 266 Z" fill="#121317" />
      <path d="M 280 246 C 330 232 420 232 470 246" stroke="rgba(255,255,255,0.18)" strokeWidth={2} fill="none" />
      <path d="M 196 304 C 216 280 248 268 300 264 L 470 258" stroke="rgba(255,255,255,0.4)" strokeWidth={3} fill="none" strokeLinecap="round" />
      {variant !== 2 && <path d="M 205 332 C 300 314 420 308 500 306" stroke={accent} strokeWidth={5} fill="none" strokeLinecap="round" />}
      <text x={420} y={346} fontSize={22} fontWeight={800} fill={ink} opacity={0.75} fontFamily="var(--font-space), sans-serif" letterSpacing={3}>
        ZX
      </text>
      <path d="M 676 132 L 672 96" stroke="#1a1b1f" strokeWidth={12} strokeLinecap="round" />
      <path d="M 632 92 L 716 86" stroke="#1a1b1f" strokeWidth={10} strokeLinecap="round" />
      <path d="M 650 90 L 640 60" stroke="#1a1b1f" strokeWidth={4} />
      <ellipse cx={637} cy={54} rx={15} ry={9} fill="#1a1b1f" />
      <path d="M 698 100 L 732 94 C 744 110 740 128 714 134 L 698 134 Z" fill={`url(#${ids.paint})`} stroke={outline} strokeWidth={1.2} />
      <Light d="M 716 106 C 728 104 734 112 732 122 C 730 128 722 130 716 128 Z" ids={ids} />
      <Light d="M 160 332 C 158 314 166 298 178 290 L 186 298 C 176 308 172 320 172 334 Z" ids={ids} color="#ff2b3a" />
      <Light d="M 780 300 C 796 310 808 322 814 336 L 806 340 C 800 328 790 316 776 306 Z" ids={ids} color="#ffb020" />
      {variant === 2 && (
        <g stroke="#1a1b1f" strokeWidth={3} fill="rgba(20,22,26,0.35)">
          <rect x={712} y={142} width={64} height={44} rx={6} />
          <path d="M 712 157 H 776 M 712 171 H 776 M 728 142 V 186 M 744 142 V 186 M 760 142 V 186" fill="none" />
        </g>
      )}
    </g>
  );
}

function Sport({ ids, accent, wheel, variant, rollKey, ink, outline }: PartProps) {
  return (
    <g>
      <Wheel cx={270} cy={392} r={80} style={wheel} ids={ids} accent={accent} rollKey={rollKey} />
      <path d="M 210 318 A 92 92 0 0 1 326 316" stroke="#15161a" strokeWidth={9} fill="none" />
      <path d="M 270 384 L 470 336 L 486 360 L 280 404 Z" fill="#1d1f24" />
      <line x1={270} y1={392} x2={480} y2={348} stroke="#30333a" strokeWidth={4} />
      <line x1={688} y1={182} x2={760} y2={392} stroke={variant === 1 ? "#c9a227" : "#2c2f35"} strokeWidth={17} strokeLinecap="round" />
      <line x1={688} y1={182} x2={716} y2={262} stroke="#2c2f35" strokeWidth={19} strokeLinecap="round" />
      <Wheel cx={760} cy={392} r={80} style={wheel} ids={ids} accent={accent} rollKey={rollKey} />
      <rect x={430} y={290} width={210} height={90} rx={18} fill="#17191e" />
      {Array.from({ length: 10 }, (_, i) => (
        <line key={i} x1={452 + i * 18} y1={302} x2={452 + i * 18} y2={368} stroke="#2a2d33" strokeWidth={4} strokeLinecap="round" />
      ))}
      <path d="M 532 312 L 516 340 L 530 340 L 522 362 L 546 330 L 532 330 L 540 312 Z" fill={accent} />
      <path d="M 252 248 L 168 308" stroke="#1a1b1f" strokeWidth={5} />
      <rect x={156} y={300} width={30} height={22} rx={3} fill="#1a1b1f" transform="rotate(-30 171 311)" />
      <path
        d="M 140 236 L 252 240 C 330 244 400 248 440 240 C 468 206 520 184 590 180 L 660 184 C 712 188 756 210 786 242 L 776 258 C 744 268 724 288 706 312 L 650 350 C 612 366 540 372 486 366 C 470 340 440 312 400 302 L 300 296 C 236 290 186 268 140 246 Z"
        fill={`url(#${ids.paint})`}
        stroke={outline}
        strokeWidth={1.5}
      />
      <path d="M 600 262 L 690 250 L 668 292 L 612 302 Z" fill={`url(#${ids.paintDark})`} />
      <path d="M 622 270 L 672 264 M 618 282 L 664 276 M 616 294 L 656 288" stroke="rgba(0,0,0,0.45)" strokeWidth={3} />
      {variant === 1 && <path d="M 486 366 C 540 372 612 366 650 350 L 662 362 C 612 386 540 392 480 382 Z" fill={accent} />}
      {variant === 1 && <path d="M 700 252 L 744 240 L 748 256 L 706 264 Z" fill="#111216" />}
      <path d="M 248 240 C 300 220 392 222 442 238 L 438 248 C 380 244 300 246 252 252 Z" fill="#121317" />
      <path d="M 470 232 C 500 204 552 192 604 190" stroke="rgba(255,255,255,0.42)" strokeWidth={3} fill="none" strokeLinecap="round" />
      <path d="M 320 290 C 420 300 520 318 662 300" stroke={accent} strokeWidth={6} fill="none" strokeLinecap="round" />
      <text x={330} y={282} fontSize={20} fontWeight={800} fill={ink} opacity={0.7} fontFamily="var(--font-space), sans-serif" letterSpacing={3}>
        ZX VOLT
      </text>
      <path d="M 646 184 L 708 148 C 726 158 744 180 752 206 C 720 194 680 186 646 184 Z" fill={`url(#${ids.glass})`} />
      <path d="M 652 186 L 612 172" stroke="#1a1b1f" strokeWidth={8} strokeLinecap="round" />
      <Light d="M 752 222 L 788 242 L 770 254 L 744 238 Z" ids={ids} />
      <Light d="M 140 236 L 162 232 L 164 246 L 142 248 Z" ids={ids} color="#ff2b3a" />
    </g>
  );
}

function Cargo({ ids, accent, wheel, variant, rollKey, ink, outline }: PartProps) {
  const bed = (top: number) => `M 104 ${top} L 634 ${top} L 634 380 L 320 380 A 76 76 0 0 0 180 380 L 104 380 Z`;
  return (
    <g>
      <Wheel cx={236} cy={404} r={62} style={wheel} ids={ids} accent={accent} ghost />
      <rect x={120} y={378} width={640} height={16} rx={4} fill="#1b1d22" />
      <Wheel cx={250} cy={410} r={62} style={wheel} ids={ids} accent={accent} rollKey={rollKey} />
      <Wheel cx={812} cy={414} r={58} style={wheel} ids={ids} accent={accent} rollKey={rollKey} />
      {variant === 1 ? (
        <g>
          <path d={bed(146)} fill={`url(#${ids.paint})`} stroke={outline} strokeWidth={1.5} />
          {Array.from({ length: 8 }, (_, i) => (
            <line key={i} x1={150 + i * 62} y1={156} x2={150 + i * 62} y2={370} stroke="rgba(0,0,0,0.16)" strokeWidth={3} />
          ))}
          <rect x={100} y={140} width={538} height={14} rx={5} fill={`url(#${ids.paintDark})`} />
          <rect x={150} y={250} width={420} height={8} rx={4} fill={accent} />
          <text x={170} y={228} fontSize={52} fontWeight={800} fill={ink} opacity={0.8} fontFamily="var(--font-space), sans-serif" letterSpacing={6}>
            ZX CARGO
          </text>
        </g>
      ) : (
        <g>
          {variant === 2 && (
            <g stroke="#1d1f24" strokeWidth={5}>
              {Array.from({ length: 21 }, (_, i) => (
                <line key={i} x1={112 + i * 25.5} y1={190} x2={112 + i * 25.5} y2={276} />
              ))}
              <line x1={106} y1={188} x2={632} y2={188} strokeWidth={10} stroke={shade("#1d1f24", 0.1)} strokeLinecap="round" />
              <line x1={106} y1={230} x2={632} y2={230} strokeWidth={4} />
            </g>
          )}
          <path d={bed(272)} fill={`url(#${ids.paint})`} stroke={outline} strokeWidth={1.5} />
          {[298, 322, 346].map((y) => (
            <line key={y} x1={116} y1={y} x2={624} y2={y} stroke="rgba(0,0,0,0.2)" strokeWidth={3} />
          ))}
          <rect x={100} y={266} width={538} height={12} rx={5} fill={`url(#${ids.paintDark})`} />
          <rect x={400} y={358} width={200} height={6} rx={3} fill={accent} />
        </g>
      )}
      <path
        d="M 640 396 L 640 200 C 640 176 656 162 680 160 L 800 158 C 820 158 832 168 838 186 L 868 300 C 876 324 882 352 882 380 L 880 396 A 70 70 0 0 0 744 396 Z"
        fill={`url(#${ids.paint})`}
        stroke={outline}
        strokeWidth={1.5}
      />
      <path d="M 640 210 L 640 200 C 640 176 656 162 680 160 L 800 158 C 820 158 832 168 838 186 L 842 198 Z" fill="#15171c" />
      <path d="M 664 206 L 806 202 L 834 286 L 664 288 Z" fill={`url(#${ids.glass})`} />
      <line x1={738} y1={204} x2={738} y2={288} stroke={`url(#${ids.paintDark})`} strokeWidth={8} />
      <path d="M 664 318 L 700 318" stroke="rgba(0,0,0,0.5)" strokeWidth={5} strokeLinecap="round" />
      <path d="M 646 300 C 700 304 780 304 868 300" stroke="rgba(255,255,255,0.3)" strokeWidth={2.5} fill="none" />
      <rect x={652} y={344} width={90} height={6} rx={3} fill={accent} />
      <path d="M 846 218 L 870 200" stroke="#1a1b1f" strokeWidth={4} />
      <ellipse cx={874} cy={194} rx={8} ry={14} fill="#1a1b1f" />
      <Light d="M 872 292 C 880 296 884 312 882 326 C 878 330 872 328 870 322 Z" ids={ids} />
      <Light d="M 876 338 L 882 338 L 882 352 L 876 352 Z" ids={ids} color="#ffb020" />
      <Light d="M 104 300 L 112 300 L 112 330 L 104 330 Z" ids={ids} color="#ff2b3a" />
    </g>
  );
}

function Passenger({ ids, accent, wheel, variant, rollKey, ink, outline }: PartProps) {
  const long = variant === 1;
  return (
    <g>
      <Wheel cx={276} cy={406} r={60} style={wheel} ids={ids} accent={accent} ghost />
      <Wheel cx={290} cy={412} r={60} style={wheel} ids={ids} accent={accent} rollKey={rollKey} />
      <Wheel cx={800} cy={416} r={56} style={wheel} ids={ids} accent={accent} rollKey={rollKey} />
      <path d="M 178 150 C 198 118 262 106 342 104 L 760 110 C 800 112 822 126 828 150 L 830 168 L 174 172 Z" fill={`url(#${ids.paintDark})`} stroke={outline} strokeWidth={1.2} />
      {long && <path d="M 230 104 L 230 92 L 700 96 L 700 108" stroke="#1d1f24" strokeWidth={6} fill="none" strokeLinejoin="round" />}
      <path d="M 206 172 L 556 172 L 556 282 L 206 282 Z" fill="rgba(6,7,10,0.72)" />
      <path d="M 566 172 L 760 172 L 760 282 L 566 282 Z" fill="rgba(6,7,10,0.5)" />
      <rect x={232} y={182} width={30} height={78} rx={10} fill="#3a2a22" />
      <rect x={232} y={232} width={230} height={36} rx={12} fill="#4a3528" />
      {long && <rect x={400} y={182} width={30} height={78} rx={10} fill="#3a2a22" />}
      <rect x={640} y={226} width={70} height={40} rx={10} fill="#3a2a22" />
      <path d="M 700 214 L 742 190" stroke="#1a1b1f" strokeWidth={7} strokeLinecap="round" />
      <path d="M 728 180 L 760 196" stroke="#1a1b1f" strokeWidth={8} strokeLinecap="round" />
      <line x1={206} y1={238} x2={556} y2={238} stroke="#9aa0aa" strokeWidth={4} />
      <rect x={190} y={168} width={18} height={116} rx={6} fill={`url(#${ids.paint})`} />
      <rect x={554} y={168} width={10} height={116} rx={4} fill="#1b1d22" />
      <path d="M 760 150 L 828 152 L 814 226 L 762 232 Z" fill={`url(#${ids.glass})`} />
      <path d="M 826 152 L 812 226" stroke={`url(#${ids.paintDark})`} strokeWidth={8} />
      <path
        d="M 170 400 C 160 360 166 300 190 280 L 690 280 C 720 280 740 250 760 230 L 812 222 C 840 230 856 270 862 320 C 866 350 868 372 866 388 L 866 400 A 68 68 0 0 0 734 400 L 363 400 A 74 74 0 0 0 217 400 Z"
        fill={`url(#${ids.paint})`}
        stroke={outline}
        strokeWidth={1.5}
      />
      <path d="M 196 296 L 690 296" stroke="rgba(255,255,255,0.35)" strokeWidth={3} strokeLinecap="round" />
      <path d="M 186 334 L 860 334" stroke={accent} strokeWidth={6} strokeLinecap="round" />
      <text x={420} y={372} fontSize={24} fontWeight={800} fill={ink} opacity={0.7} fontFamily="var(--font-space), sans-serif" letterSpacing={4}>
        ZX RICKSHAW
      </text>
      <circle cx={842} cy={256} r={13} fill="#1a1b1f" />
      <Light d="M 833 256 A 9 9 0 1 0 851 256 A 9 9 0 1 0 833 256 Z" ids={ids} />
      <Light d="M 856 296 L 864 298 L 864 312 L 857 310 Z" ids={ids} color="#ffb020" />
      <Light d="M 168 312 L 178 310 L 180 340 L 170 342 Z" ids={ids} color="#ff2b3a" />
    </g>
  );
}

const PARTS: Record<VehicleKind, (p: PartProps) => React.ReactElement> = { commuter: Commuter, sport: Sport, cargo: Cargo, passenger: Passenger };

export default function Vehicle({
  kind,
  variant = 0,
  color,
  wheel = "five",
  accent = "#2ee6a6",
  rollKey,
  reflection = true,
  className = "",
  title,
}: {
  kind: VehicleKind;
  variant?: number;
  color: string;
  wheel?: WheelStyle | string;
  accent?: string;
  rollKey?: string | number;
  reflection?: boolean;
  className?: string;
  title?: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const ids: Ids = { paint: `p${uid}`, paintDark: `pd${uid}`, glass: `gl${uid}`, rim: `rm${uid}`, shadow: `sh${uid}`, fade: `fd${uid}`, glow: `gw${uid}`, group: `v${uid}` };
  const ink = luminance(color) > 0.55 ? "#0b0f16" : "#ffffff";
  const outline = luminance(color) > 0.7 ? "rgba(10,14,20,0.35)" : "rgba(0,0,0,0.45)";
  const Part = PARTS[kind];
  const ws = (["five", "aero", "twin", "ten", "turbine"].includes(wheel) ? wheel : "five") as WheelStyle;
  return (
    <svg viewBox="0 0 1000 560" className={className} role="img" aria-label={title}>
      <defs>
        <linearGradient id={ids.paint} x1="0" y1="0" x2="0" y2="1" className="paint">
          <stop offset="0" style={{ stopColor: shade(color, 0.38) }} />
          <stop offset="0.42" style={{ stopColor: color }} />
          <stop offset="1" style={{ stopColor: shade(color, -0.5) }} />
        </linearGradient>
        <linearGradient id={ids.paintDark} x1="0" y1="0" x2="0" y2="1" className="paint">
          <stop offset="0" style={{ stopColor: shade(color, -0.2) }} />
          <stop offset="1" style={{ stopColor: shade(color, -0.6) }} />
        </linearGradient>
        <linearGradient id={ids.glass} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9fc3e6" stopOpacity="0.75" />
          <stop offset="0.5" stopColor="#1b2533" stopOpacity="0.85" />
          <stop offset="1" stopColor="#0a0e14" stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id={ids.rim} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#eef1f5" />
          <stop offset="0.5" stopColor="#9aa1ac" />
          <stop offset="1" stopColor="#4b5059" />
        </linearGradient>
        <radialGradient id={ids.shadow}>
          <stop offset="0" stopColor="#000" stopOpacity="0.75" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={ids.fade} x1="0" y1="472" x2="0" y2="560" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" stopOpacity="0.4" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id={`m${uid}`}>
          <rect x="0" y="472" width="1000" height="88" fill={`url(#${ids.fade})`} />
        </mask>
        <filter id={ids.glow} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>
      <ellipse cx="500" cy="474" rx="420" ry="22" fill={`url(#${ids.shadow})`} />
      <g id={ids.group}>
        <Part ids={ids} accent={accent} wheel={ws} variant={variant} rollKey={rollKey} ink={ink} outline={outline} />
      </g>
      {reflection && <use href={`#${ids.group}`} transform="translate(0 944) scale(1 -1)" mask={`url(#m${uid})`} opacity={0.5} />}
    </svg>
  );
}

/** Small standalone rim for the wheel-style picker. */
export function WheelSwatch({ style, accent = "#2ee6a6", size = 56 }: { style: WheelStyle | string; accent?: string; size?: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const ids = { rim: `r${uid}` } as Ids;
  const ws = (["five", "aero", "twin", "ten", "turbine"].includes(style) ? style : "five") as WheelStyle;
  return (
    <svg width={size} height={size} viewBox="-50 -50 100 100" aria-hidden>
      <defs>
        <linearGradient id={ids.rim} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#eef1f5" />
          <stop offset="0.5" stopColor="#9aa1ac" />
          <stop offset="1" stopColor="#4b5059" />
        </linearGradient>
      </defs>
      <circle r={48} fill="#0b0c0e" />
      <circle r={32} fill="#121318" />
      <circle r={19} fill="#41454e" />
      <Spokes style={ws} R={32} ids={ids} />
      <circle r={6.4} fill="#22252b" />
      <circle r={2.4} fill={accent} />
      <circle r={32} fill="none" stroke={`url(#${ids.rim})`} strokeWidth={3} />
    </svg>
  );
}
