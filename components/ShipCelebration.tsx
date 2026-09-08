"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo } from "react";

/** How long the confetti and the banner stay on screen. */
export const CELEBRATION_MS = 4200;

const PIECES = 70;
const COLORS = ["bg-sooner", "bg-safer", "bg-happier", "bg-ink"];

export type Celebration = {
  /** identifies the shipped idea, and re-seeds the confetti for each new one */
  key: number;
  headline: string;
  detail?: string;
};

/**
 * A tiny seeded generator (mulberry32) instead of `Math.random`: scattering the
 * confetti stays a pure function of the shipped idea's number, so a re-render
 * mid-celebration cannot reshuffle the pieces in mid-air.
 */
function scatter(seed: number): () => number {
  let state = seed * 2654435761 + 0x6d2b79f5;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Confetti raining across the whole viewport. Decorative only: hidden from
 * assistive tech, and skipped entirely for anyone who has asked for reduced
 * motion.
 */
function Confetti({ seed }: { seed: number }) {
  const pieces = useMemo(() => {
    const next = scatter(seed);
    return Array.from({ length: PIECES }, (_, i) => {
      const round = i % 3 === 0;
      const size = 6 + Math.round(next() * 6);
      return {
        color: COLORS[i % COLORS.length],
        round,
        style: {
          left: `${next() * 100}%`,
          width: size,
          height: size * (round ? 1 : 1.8),
          animationDelay: `${next() * 900}ms`,
          animationDuration: `${2400 + next() * 1400}ms`,
          "--confetti-drift": `${Math.round((next() - 0.5) * 30)}vw`,
          "--confetti-spin": `${Math.round(360 + next() * 900)}deg`,
        } as CSSProperties,
      };
    });
  }, [seed]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-40 overflow-hidden motion-reduce:hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          className={`animate-confetti absolute top-0 ${p.color} ${p.round ? "rounded-full" : "rounded-sm"}`}
          style={p.style}
        />
      ))}
    </div>
  );
}

/**
 * The moment an idea goes live. Everyone with the board open sees this within a
 * poll of the card landing in Done — not just the facilitator who moved it —
 * so a room full of contributors celebrates together.
 */
export default function ShipCelebration({
  celebration,
  onDone,
}: {
  celebration: Celebration | null;
  onDone: () => void;
}) {
  useEffect(() => {
    if (!celebration) return;
    const timer = setTimeout(onDone, CELEBRATION_MS);
    return () => clearTimeout(timer);
  }, [celebration, onDone]);

  if (!celebration) return null;

  return (
    <>
      <Confetti seed={celebration.key} />
      <div className="pointer-events-none fixed inset-x-0 top-24 z-50 flex justify-center px-4">
        <div
          role="status"
          aria-live="polite"
          className="animate-ship-pop max-w-md rounded-2xl border border-sooner/40 bg-white/95 px-6 py-5 text-center shadow-xl backdrop-blur motion-reduce:animate-none"
        >
          <div className="text-4xl" aria-hidden>
            🚀
          </div>
          <p className="mt-2 text-lg font-bold leading-snug">Shipped!</p>
          <p className="mt-1 text-sm font-semibold text-ink">{celebration.headline}</p>
          {celebration.detail && <p className="mt-1 text-xs text-ink-soft">{celebration.detail}</p>}
        </div>
      </div>
    </>
  );
}
