type P = React.SVGProps<SVGSVGElement> & { size?: number };

const S = ({ size = 18, children, ...p }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>
    {children}
  </svg>
);

/** Direction-aware: points "forward" in both LTR and RTL. */
export const Arrow = ({ className = "", ...p }: P) => (
  <S {...p} className={`rtl:-scale-x-100 ${className}`}><path d="M5 12h14M13 6l6 6-6 6" /></S>
);
export const Back = ({ className = "", ...p }: P) => (
  <S {...p} className={`rtl:-scale-x-100 ${className}`}><path d="M19 12H5M11 6l-6 6 6 6" /></S>
);
export const Chevron = (p: P) => <S {...p}><path d="m6 9 6 6 6-6" /></S>;
/** Small forward chevron (REVOO button style); flips in RTL. */
export const ChevronFwd = ({ className = "", ...p }: P) => (
  <S strokeWidth={2.4} {...p} className={`rtl:-scale-x-100 ${className}`}><path d="m9 6 6 6-6 6" /></S>
);
export const ArrowUp = (p: P) => <S {...p}><path d="M12 19V5M6 11l6-6 6 6" /></S>;
export const Sliders = (p: P) => <S {...p}><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></S>;
export const Boxes = (p: P) => <S {...p}><path d="M3 9l4-2 4 2v5l-4 2-4-2zM13 9l4-2 4 2v5l-4 2-4-2zM8 16l4-2 4 2v4l-4 2-4-2z" /></S>;
export const Receipt = (p: P) => <S {...p}><path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3" /></S>;
export const Truck = (p: P) => <S {...p}><path d="M2 6h11v10H2zM13 10h4l4 4v2h-8z" /><circle cx="6" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></S>;
export const Ship = (p: P) => <S {...p}><path d="M3 15l2 5h14l2-5zM5 15V9h14v6M12 9V4M9 4h6" /></S>;
export const Factory = (p: P) => <S {...p}><path d="M3 21V10l6 4V10l6 4V6l6 3v12zM7 17h2M12 17h2M17 17h2" /></S>;
export const Store = (p: P) => <S {...p}><path d="M3 9l2-5h14l2 5M4 9v11h16V9M3 9h18M9 20v-6h6v6" /></S>;
export const User = (p: P) => <S {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></S>;
export const Globe = (p: P) => <S {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" /></S>;
export const Check = (p: P) => <S {...p}><path d="m5 12 5 5 9-10" /></S>;
export const X = (p: P) => <S {...p}><path d="M6 6l12 12M18 6 6 18" /></S>;
export const Phone = (p: P) => <S {...p}><path d="M5 4h4l2 5-3 2a11 11 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 6a2 2 0 0 1 2-2z" /></S>;
export const Pin = (p: P) => <S {...p}><path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z" /><circle cx="12" cy="9" r="2.5" /></S>;
export const Battery = (p: P) => <S {...p}><rect x="2" y="7" width="17" height="10" rx="2" /><path d="M22 11v2M6 10v4M10 10v4" /></S>;
export const Gauge = (p: P) => <S {...p}><path d="M4 18a9 9 0 1 1 16 0" /><path d="m12 13 4-4" /></S>;
export const Bolt = (p: P) => <S {...p}><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></S>;
export const Clock = (p: P) => <S {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></S>;
export const Download = (p: P) => <S {...p}><path d="M12 4v11M7 10l5 5 5-5M4 20h16" /></S>;
export const Share = (p: P) => <S {...p}><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="m8.2 10.8 7.6-4.6M8.2 13.2l7.6 4.6" /></S>;
export const Printer = (p: P) => <S {...p}><path d="M7 8V3h10v5M6 17H4v-6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6h-2M7 14h10v7H7z" /></S>;
export const Refresh = (p: P) => <S {...p}><path d="M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4" /></S>;
export const Bookmark = (p: P) => <S {...p}><path d="M6 3h12v18l-6-4-6 4z" /></S>;
export const Search = (p: P) => <S {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></S>;
export const Shield = (p: P) => <S {...p}><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" /><path d="m9 12 2 2 4-4" /></S>;
export const Lock = (p: P) => <S {...p}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></S>;
export const Wallet = (p: P) => <S {...p}><path d="M4 7h15a1 1 0 0 1 1 1v11H5a1 1 0 0 1-1-1V6a2 2 0 0 1 2-2h11v3" /><circle cx="16" cy="13" r="1.3" /></S>;
export const Card = (p: P) => <S {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h3" /></S>;
export const Bank = (p: P) => <S {...p}><path d="M3 10 12 4l9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18" /></S>;
export const Mobile = (p: P) => <S {...p}><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></S>;
export const Logout = (p: P) => <S {...p}><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" /></S>;
export const Doc = (p: P) => <S {...p}><path d="M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6" /></S>;
export const Spark = (p: P) => <S {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" /></S>;
