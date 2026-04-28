import { Sun, Moon } from "lucide-react";
import { Link } from "react-router";
import { useThemeStore } from "../store/useThemeStore";

/** Neural IQ logo mark */
export function InterviewIQLogo({ size = 36 }: { size?: number }) {
  const n1  = { x: 140, y: 50  };
  const n2  = { x: 75,  y: 105 }; const n3  = { x: 140, y: 105 }; const n4  = { x: 205, y: 105 };
  const n5  = { x: 75,  y: 165 }; const n6  = { x: 140, y: 165 }; const n7  = { x: 205, y: 165 };
  const n8  = { x: 75,  y: 225 }; const n9  = { x: 140, y: 225 }; const n10 = { x: 205, y: 225 };
  const n11 = { x: 140, y: 278 };

  type Pt = typeof n1;
  const L2 = [n2, n3, n4], L3 = [n5, n6, n7], L4 = [n8, n9, n10];
  const edges: [Pt, Pt][] = [
    ...L2.map(b  => [n1, b]  as [Pt, Pt]),
    ...L2.flatMap(a => L3.map(b => [a, b] as [Pt, Pt])),
    ...L3.flatMap(a => L4.map(b => [a, b] as [Pt, Pt])),
    ...L4.map(a  => [a, n11] as [Pt, Pt]),
  ];
  const cyan = "#1de9f5";

  return (
    <svg width={size} height={size} viewBox="0 0 280 340" fill="none"
      xmlns="http://www.w3.org/2000/svg" aria-label="InterviewIQ logo">
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <radialGradient id="nodeGrad" cx="35%" cy="35%">
          <stop offset="0%" stopColor="#7ffcff" />
          <stop offset="100%" stopColor="#00adb5" />
        </radialGradient>
      </defs>

      {/* Dark background — always dark so it looks like an app icon */}
      <rect width="280" height="340" rx="60" fill="#090e1c" />

      {/* Connection lines */}
      {edges.map(([a, b], i) => (
        <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
          stroke={cyan} strokeWidth="1.6" strokeOpacity="0.45" />
      ))}

      {/* Regular nodes */}
      {[n1, n2, n3, n4, n5, n7, n8, n9, n10, n11].map((n, i) => (
        <circle key={i} cx={n.x} cy={n.y} r={10} fill="url(#nodeGrad)" filter="url(#glow)" />
      ))}

      {/* Centre focal node — larger */}
      <circle cx={n6.x} cy={n6.y} r={15} fill="url(#nodeGrad)" filter="url(#glow)" />

      {/* IQ pill */}
      <rect x="80" y="300" width="120" height="36" rx="18" fill={cyan} />
      <text x="140" y="325" textAnchor="middle"
        fontFamily="'Inter', system-ui, sans-serif"
        fontWeight="800" fontSize="20" fill="#090e1c" letterSpacing="2">
        IQ
      </text>
    </svg>
  );
}

/** Full logo wordmark: icon + "InterviewIQ" text linked to home */
export function LogoWordmark({ size = 52 }: { size?: number }) {
  return (
    <Link to="/" className="flex items-center gap-2.5 group select-none">
      <InterviewIQLogo size={size} />
      <span className="font-extrabold text-xl md:text-2xl tracking-tight text-foreground group-hover:text-primary transition-colors">
        Interview<span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">IQ</span>
      </span>
    </Link>
  );
}

/** Sun/Moon toggle button */
export function ThemeToggle() {
  const { isDark, toggle } = useThemeStore();
  return (
    <button
      id="theme-toggle"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="relative w-9 h-9 flex items-center justify-center rounded-xl border border-border/50 bg-muted/60 hover:bg-muted hover:border-primary/40 transition-all duration-200 overflow-hidden"
    >
      <span className="absolute transition-all duration-300" style={{
        opacity: isDark ? 0 : 1,
        transform: isDark ? "rotate(90deg) scale(0.5)" : "rotate(0deg) scale(1)",
      }}>
        <Sun className="w-4 h-4 text-amber-500" />
      </span>
      <span className="absolute transition-all duration-300" style={{
        opacity: isDark ? 1 : 0,
        transform: isDark ? "rotate(0deg) scale(1)" : "rotate(-90deg) scale(0.5)",
      }}>
        <Moon className="w-4 h-4 text-indigo-400" />
      </span>
    </button>
  );
}
