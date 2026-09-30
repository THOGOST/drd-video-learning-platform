"use client";

// ─────────────────────────────────────────────────────────────
// مكتبة أنميشن موحّدة للموقع بالكامل (framer-motion)
// FadeIn / Stagger / PageTransition / AnimatedCounter / ProgressRing / HoverCard
// ─────────────────────────────────────────────────────────────

import {
  motion,
  useInView,
  useMotionValue,
  useSpring,
  type Variants,
} from "framer-motion";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

// ─── FadeIn: ظهور تدريجي عند الظهور في الشاشة ───
export function FadeIn({
  children,
  delay = 0,
  y = 24,
  className,
  once = true,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  once?: boolean;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-40px" }}
      transition={{ duration: 0.55, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      {children}
    </motion.div>
  );
}

// ─── Stagger: ظهور متتابع لعناصر القوائم ───
const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const staggerItem: Variants = {
  hidden: { opacity: 0, y: 22, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] },
  },
};

export function Stagger({
  children,
  className,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section";
}) {
  const Comp = as === "section" ? motion.section : motion.div;
  return (
    <Comp
      className={className}
      variants={staggerContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
    >
      {children}
    </Comp>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={staggerItem} className={className}>
      {children}
    </motion.div>
  );
}

// ─── PageTransition: انتقال سلس بين صفحات التطبيق ───
export function PageTransition({
  children,
  routeKey,
}: {
  children: ReactNode;
  routeKey: string;
}) {
  return (
    <motion.div
      key={routeKey}
      initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

// ─── AnimatedCounter: عداد رقمي يتصاعد بنعومة ───
export function AnimatedCounter({
  value,
  suffix = "",
  className,
  duration = 1.2,
}: {
  value: number;
  suffix?: string;
  className?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20px" });
  const [display, setDisplay] = useState(0);
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { duration: duration * 1000, bounce: 0 });

  useEffect(() => {
    if (inView) mv.set(value);
  }, [inView, value, mv]);

  useEffect(() => {
    const unsub = spring.on("change", (v) => setDisplay(Math.round(v)));
    return unsub;
  }, [spring]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {display}
      {suffix}
    </span>
  );
}

// ─── ProgressRing: حلقة تقدم دائرية متحركة ───
export function ProgressRing({
  value,
  size = 120,
  strokeWidth = 10,
  label,
  sublabel,
  className,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20px" });
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, value));
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const t = setTimeout(() => setProgress(clamped), 150);
    return () => clearTimeout(t);
  }, [inView, clamped]);

  return (
    <div
      ref={ref}
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ? `${label}: ${clamped}%` : `${clamped}%`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          className="stroke-primary"
          initial={{ strokeDashoffset: circumference }}
          animate={{
            strokeDashoffset: circumference - (progress / 100) * circumference,
          }}
          transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          style={
            {
              filter: "drop-shadow(0 0 6px hsl(var(--primary) / 0.35))",
            } as CSSProperties
          }
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <AnimatedCounter
          value={clamped}
          suffix="%"
          className="text-2xl font-extrabold"
        />
        {sublabel && (
          <p className="text-[11px] text-muted-foreground mt-0.5">{sublabel}</p>
        )}
      </div>
    </div>
  );
}

// ─── HoverLift: بطاقة ترتفع عند التمرير ───
export function HoverLift({
  children,
  className,
  lift = 6,
}: {
  children: ReactNode;
  className?: string;
  lift?: number;
}) {
  return (
    <motion.div
      className={className}
      whileHover={{ y: -lift, transition: { duration: 0.25 } }}
      whileTap={{ scale: 0.985 }}
    >
      {children}
    </motion.div>
  );
}

// ─── FloatingBlobs: خلفية تدرجات متحركة للهيرو ───
export function FloatingBlobs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <motion.div
        className="absolute -top-24 -start-24 size-80 rounded-full bg-primary/15 blur-3xl"
        animate={{ x: [0, 40, 0], y: [0, 30, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-32 -end-24 size-96 rounded-full bg-primary/10 blur-3xl"
        animate={{ x: [0, -50, 0], y: [0, -35, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
      <motion.div
        className="absolute top-1/3 end-1/4 size-44 rounded-full bg-primary/10 blur-2xl"
        animate={{ y: [0, -45, 0], scale: [1, 1.25, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      />
    </div>
  );
}
