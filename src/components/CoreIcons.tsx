/** The four core-entry icons. Flat two-tone drawings (stroke + a light tint of the same colour, white details) with
 *  purposeful motion defined in globals.css (.ico-*): wheels spin, paint colours cycle, the box lid lifts, checklist
 *  ticks draw in turn, the truck drives along a moving route. Colour comes from the parent (`currentColor`).
 *  Motion pauses for prefers-reduced-motion and can be switched off with the `ico-static` class (footer, menus). */

type P = { size?: number; className?: string; style?: React.CSSProperties };

function Icon({ size = 34, className = "", style, children }: P & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden className={`ico ${className}`} style={style} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

const d = (s: number) => ({ animationDelay: `${s}s` });
const TINT = 0.16;

/** Wheel with spinning spokes. */
const Wheel = ({ cx, cy, r = 6.2 }: { cx: number; cy: number; r?: number }) => (
  <g>
    <circle cx={cx} cy={cy} r={r} fill="#fff" stroke="currentColor" strokeWidth="2.5" />
    <g className="ico-spin">
      {[0, 60, 120].map((a) => (
        <path key={a} d={`M${cx} ${cy - r + 2.7}V${cy + r - 2.7}`} stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.3" transform={`rotate(${a} ${cx} ${cy})`} />
      ))}
    </g>
    <circle cx={cx} cy={cy} r="1.8" fill="currentColor" />
  </g>
);

const Sparkle = ({ x, y, s = 1, delay = 0 }: { x: number; y: number; s?: number; delay?: number }) => (
  <path className="ico-twinkle" style={d(delay)} d={`M${x} ${y - 4 * s}l${1.1 * s} ${2.9 * s} ${2.9 * s} ${1.1 * s}-${2.9 * s} ${1.1 * s}-${1.1 * s} ${2.9 * s}-${1.1 * s}-${2.9 * s}-${2.9 * s}-${1.1 * s} ${2.9 * s}-${1.1 * s}z`} fill="currentColor" />
);

/** Vehicle Customize — scooter whose paint keeps changing colour */
export const IconConfigure = (p: P) => (
  <Icon {...p}>
    <circle className="ico-pulse" style={d(0)} cx="7.2" cy="6.6" r="3.3" fill="currentColor" />
    <circle className="ico-pulse" style={d(0.3)} cx="15.4" cy="6.6" r="3.3" fill="currentColor" fillOpacity="0.5" />
    <circle className="ico-pulse" style={d(0.6)} cx="23.6" cy="6.6" r="3.3" fill="#fff" stroke="currentColor" strokeWidth="2" />
    <Sparkle x={38.5} y={7} delay={0.4} />
    <g className="ico-bob">
      <path d="M5.5 33.6C5 27 8.8 23.4 14 23.4h8.2c2.4 0 3.9 1.3 4.6 3.7l1.2 4.4H20.8c-1 1.7-2.6 2.7-4.6 2.7H7.2c-1 0-1.7-.2-1.7-.6z" fill="currentColor" fillOpacity={TINT} stroke="currentColor" strokeWidth="2.2" />
      <ellipse className="ico-paint" cx="14.4" cy="29.2" rx="4.8" ry="2.5" />
      <path d="M8.6 21.8H21" stroke="currentColor" strokeWidth="4.4" />
      <rect x="3.2" y="26" width="2.2" height="4.4" rx="1.1" fill="currentColor" />
      <path d="M26 31.6h9.2" stroke="currentColor" strokeWidth="3.3" />
      <path d="M32.2 31L30.6 17.6l3.9-.5L38.4 31z" fill="currentColor" fillOpacity={TINT} stroke="currentColor" strokeWidth="2" />
      <path d="M27.6 14.2h8.4" stroke="currentColor" strokeWidth="3" />
      <path d="M36.6 15.4l3.2 1.6v3.3l-3.4-.8z" fill="currentColor" />
      <path d="M31 35.4a7 7 0 0112.6 0" stroke="currentColor" strokeWidth="2.4" />
      <Wheel cx={11.5} cy={37.6} />
      <Wheel cx={37.5} cy={37.6} />
    </g>
  </Icon>
);

/** Inventory Query — box that opens, then confirms "in stock" */
export const IconStock = (p: P) => (
  <Icon {...p}>
    <path d="M7 20l15 8v14.5L7 34.5z" fill="currentColor" fillOpacity={TINT} stroke="currentColor" strokeWidth="2.2" />
    <path d="M22 28l15-8v14.5l-15 8z" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="2.2" />
    <path d="M26 32.4l7-3.7v5.2l-7 3.7z" fill="#fff" fillOpacity="0.9" />
    <g className="ico-lid">
      <path d="M7 20l15-8 15 8-15 8z" fill="currentColor" fillOpacity="0.5" stroke="currentColor" strokeWidth="2.2" />
      <path d="M14.6 16l15 8" stroke="#fff" strokeWidth="2.6" />
    </g>
    <Sparkle x={22} y={4.5} s={0.9} delay={0.2} />
    <g className="ico-badge">
      <circle cx="37.5" cy="37" r="8.8" fill="currentColor" stroke="#fff" strokeWidth="2.6" />
      <path className="ico-check" pathLength={1} d="M33.2 37.2l3.1 3.1 5.6-6" stroke="#fff" strokeWidth="2.8" />
    </g>
  </Icon>
);

/** My Orders — receipt whose items tick off one by one */
export const IconOrders = (p: P) => (
  <Icon {...p}>
    <g className="ico-bob">
      <path d="M10.5 4.5h24a2.5 2.5 0 012.5 2.5v35.6l-4.1-2.7-4.2 2.7-4.2-2.7-4.2 2.7-4.2-2.7-4.2 2.7V7a2.5 2.5 0 012.5-2.5z" fill="currentColor" fillOpacity={TINT} stroke="currentColor" strokeWidth="2.2" />
      {[16.5, 25, 33.5].map((y, i) => (
        <g key={y}>
          <circle cx="16.4" cy={y} r="3.5" fill="#fff" stroke="currentColor" strokeWidth="2" />
          <circle className="ico-dot" style={d(i * 0.9)} cx="16.4" cy={y} r="3.5" fill="currentColor" />
          <path className="ico-tick" style={d(0.15 + i * 0.9)} pathLength={1} d={`M14.7 ${y + 0.1}l1.3 1.3 2.2-2.6`} stroke="#fff" strokeWidth="1.9" />
          <path className="ico-grow" style={d(i * 0.9)} d={`M23.5 ${y}h${[8, 5.5, 3.5][i]}`} stroke="currentColor" strokeWidth="2.5" />
        </g>
      ))}
      <rect x="13" y="37.6" width="18" height="2.2" rx="1.1" fill="currentColor" fillOpacity="0.32" />
    </g>
    <g className="ico-seal">
      <circle cx="38" cy="10" r="7.2" fill="currentColor" stroke="#fff" strokeWidth="2.4" />
      <path className="ico-tick-seal" pathLength={1} d="M34.8 10.2l2.2 2.2 4.1-4.4" stroke="#fff" strokeWidth="2.4" />
    </g>
  </Icon>
);

/** Logistics Tracking — truck driving along a moving route to a pin */
export const IconTrack = (p: P) => (
  <Icon {...p}>
    <path className="ico-march" d="M16.5 20.5c3.2-8.5 9-8 11.4-12.2" stroke="currentColor" strokeWidth="2.1" strokeDasharray="0.8 4.3" />
    <ellipse className="ico-ripple" cx="37" cy="26" rx="6" ry="1.8" fill="currentColor" fillOpacity="0.35" />
    <g className="ico-hop">
      <path d="M37 2.5a8.3 8.3 0 018.3 8.3c0 6.5-8.3 14.4-8.3 14.4s-8.3-7.9-8.3-14.4A8.3 8.3 0 0137 2.5z" fill="currentColor" />
      <circle cx="37" cy="10.8" r="3.3" fill="#fff" />
    </g>
    <g className="ico-drive">
      <path d="M3.5 22.4a2.4 2.4 0 012.4-2.4h17.7a2.4 2.4 0 012.4 2.4V36H3.5z" fill="currentColor" fillOpacity={TINT} stroke="currentColor" strokeWidth="2.2" />
      <path d="M8.5 25.5h11M8.5 29.5h7" stroke="currentColor" strokeOpacity="0.5" strokeWidth="2" />
      <path d="M26 25.6h6.4a2.4 2.4 0 012 1l3.6 5.2a2.4 2.4 0 01.4 1.3V36H26z" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="2.2" />
      <path d="M29 28.4h2.8l2.5 3.6H29z" fill="#fff" />
      <path className="ico-flicker" d="M1.5 40.4h5" stroke="currentColor" strokeWidth="1.6" />
      <path className="ico-flicker" style={d(0.35)} d="M4 43.6h4" stroke="currentColor" strokeWidth="1.6" />
      <Wheel cx={12.5} cy={38.4} r={4.4} />
      <Wheel cx={31.5} cy={38.4} r={4.4} />
    </g>
  </Icon>
);
