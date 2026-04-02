import { useMemo } from "react";
import { useTheme } from "../theme/ThemeContext";

/**
 * Animated synthwave background — setting sun, perspective grid, horizon glow,
 * twinkling stars, vertical light streaks, and CRT scanlines.
 * Only renders when the "synth" theme is active.
 * Pure CSS, no JS animation loops. Fixed behind all content.
 */
export function SynthBackground() {
  const { themeName } = useTheme();
  if (themeName !== "synth") return null;

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {/* Sky gradient — deep purple to near-black */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to bottom, #05020e 0%, #0c0625 35%, #1a0a3a 55%, #150828 70%, #0d0618 85%, #080312 100%)",
        }}
      />

      {/* Horizon glow — broad warm band behind the sun */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: "27%",
          height: "20%",
          background: "linear-gradient(to bottom, transparent 0%, rgba(255,107,53,0.05) 30%, rgba(255,45,149,0.06) 50%, rgba(255,107,53,0.05) 70%, transparent 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Atmospheric bands */}
      <AtmosphericBands />

      {/* Stars */}
      <Stars />

      {/* Sun — striped circle sitting on the horizon */}
      <div
        style={{
          position: "absolute",
          bottom: "36%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 180,
          height: 180,
          borderRadius: "50%",
          background: "linear-gradient(to bottom, #ff2d95 0%, #ff6b35 40%, #ffe44d 100%)",
          boxShadow: "0 0 80px 30px rgba(255,45,149,0.30), 0 0 160px 60px rgba(255,107,53,0.15)",
          animation: "synth-sun-breathe 8s ease-in-out infinite",
          overflow: "hidden",
        }}
      >
        {/* Horizontal slice gaps — the classic retrowave sun look */}
        {[28, 22, 17, 13, 10, 8].map((gap, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: `${12 + i * 12}%`,
              height: gap,
              background: "#080312",
            }}
          />
        ))}
      </div>

      {/* Sun underglow — localized radial glow */}
      <div
        style={{
          position: "absolute",
          bottom: "28%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "45vw",
          height: "25vh",
          borderRadius: "50%",
          background: "radial-gradient(ellipse at 50% 30%, rgba(255,107,53,0.07) 0%, rgba(255,45,149,0.04) 40%, transparent 70%)",
          filter: "blur(30px)",
          pointerEvents: "none",
        }}
      />

      {/* Sun reflection glow on the ground */}
      <div
        style={{
          position: "absolute",
          bottom: "-5%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "180%",
          height: "65%",
          background: `
            radial-gradient(ellipse at 50% 0%, rgba(255,45,149,0.35) 0%, rgba(255,107,53,0.15) 30%, rgba(0,240,255,0.08) 55%, transparent 80%)
          `,
          animation: "synth-horizon-pulse 6s ease-in-out infinite",
        }}
      />

      {/* Secondary cyan underglow */}
      <div
        style={{
          position: "absolute",
          bottom: "0",
          left: "50%",
          transform: "translateX(-50%)",
          width: "120%",
          height: "25%",
          background:
            "radial-gradient(ellipse at 50% 100%, rgba(0,240,255,0.18) 0%, transparent 60%)",
          animation: "synth-horizon-pulse 6s ease-in-out infinite",
          animationDelay: "-3s",
        }}
      />

      {/* Perspective grid */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: "-50%",
          width: "200%",
          height: "75%",
          transformOrigin: "center bottom",
          transform: "perspective(500px) rotateX(55deg)",
          backgroundImage: `
            linear-gradient(to right, rgba(0,240,255,0.40) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0,240,255,0.35) 1px, transparent 1px)
          `,
          backgroundSize: "56px 56px",
          animation: "synth-grid-scroll 2.5s linear infinite",
          maskImage: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.15) 65%, transparent 90%)",
          WebkitMaskImage: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.15) 65%, transparent 90%)",
        }}
      />

      {/* Grid fade-in color zone — warm transition at sky-ground boundary */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: "30%",
          height: "15%",
          background: "linear-gradient(to bottom, transparent 0%, rgba(255,107,53,0.03) 20%, rgba(255,45,149,0.05) 45%, rgba(255,107,53,0.04) 65%, rgba(255,45,149,0.02) 85%, transparent 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Horizon line */}
      <div
        style={{
          position: "absolute",
          bottom: "37%",
          left: 0,
          right: 0,
          height: "6px",
          background: "linear-gradient(to right, transparent 5%, rgba(0,240,255,0.22) 25%, rgba(255,45,149,0.28) 50%, rgba(0,240,255,0.22) 75%, transparent 95%)",
          boxShadow: "0 0 40px 12px rgba(255,45,149,0.18), 0 0 100px 25px rgba(0,240,255,0.10)",
          maskImage: "linear-gradient(to bottom, transparent, white 30%, white 70%, transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent, white 30%, white 70%, transparent)",
        }}
      />

      {/* Vertical light streaks — slow-rising columns */}
      <VerticalStreaks />

      {/* Scanline overlay — CRT texture */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)",
          opacity: 0.5,
        }}
      />

      {/* Sweeping scanline bar */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          height: "6px",
          background: "linear-gradient(to right, transparent, rgba(0,240,255,0.18), rgba(255,45,149,0.12), transparent)",
          boxShadow: "0 0 16px 3px rgba(0,240,255,0.10)",
          animation: "synth-scanline 7s linear infinite",
          opacity: 0.8,
        }}
      />
    </div>
  );
}

/** Thin atmospheric bands at varying heights — subtle color wash. */
function AtmosphericBands() {
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: "52%",
          height: "12%",
          background: "linear-gradient(to bottom, transparent 0%, rgba(0,240,255,0.025) 50%, transparent 100%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: "60%",
          height: "8%",
          background: "linear-gradient(to bottom, transparent 0%, rgba(255,45,149,0.02) 40%, rgba(0,240,255,0.03) 60%, transparent 100%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: "66%",
          height: "10%",
          background: "linear-gradient(to bottom, transparent 0%, rgba(0,240,255,0.03) 50%, transparent 100%)",
          pointerEvents: "none",
        }}
      />
    </>
  );
}

/** Deterministic star field — scattered dots with staggered twinkle. */
function Stars() {
  const stars = useMemo(() => {
    const seed = [
      [8, 12], [23, 5], [45, 18], [67, 8], [82, 22], [15, 30], [38, 7],
      [55, 25], [72, 14], [91, 19], [5, 20], [29, 3], [50, 10], [76, 28],
      [88, 6], [12, 26], [42, 15], [63, 2], [35, 22], [58, 9], [95, 16],
      [18, 8], [47, 27], [70, 4], [83, 24], [26, 14], [53, 20], [9, 17],
      [61, 11], [78, 26], [33, 6], [44, 23], [86, 10], [20, 18], [66, 21],
    ];
    return seed.map(([x, y], i) => ({
      left: `${x}%`,
      top: `${y}%`,
      size: i % 3 === 0 ? 2 : 1,
      delay: `${(i * 0.7) % 5}s`,
      duration: `${2 + (i % 3)}s`,
      color: i % 5 === 0 ? "rgba(0,240,255,0.8)" : i % 7 === 0 ? "rgba(255,45,149,0.7)" : "rgba(255,255,255,0.7)",
    }));
  }, []);

  return (
    <>
      {stars.map((s, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            borderRadius: "50%",
            backgroundColor: s.color,
            boxShadow: s.size > 1 ? `0 0 4px 1px ${s.color}` : undefined,
            animation: `synth-star-twinkle ${s.duration} ease-in-out infinite`,
            animationDelay: s.delay,
          }}
        />
      ))}
    </>
  );
}

/** Faint vertical light columns drifting upward from the horizon. */
function VerticalStreaks() {
  const streaks = useMemo(() => {
    const positions = [15, 30, 48, 55, 70, 85];
    return positions.map((x, i) => ({
      left: `${x}%`,
      width: i % 2 === 0 ? 1 : 2,
      color: i % 2 === 0 ? "rgba(0,240,255,0.06)" : "rgba(255,45,149,0.05)",
      duration: `${6 + (i % 3) * 2}s`,
      delay: `${i * 1.2}s`,
    }));
  }, []);

  return (
    <>
      {streaks.map((s, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: s.left,
            bottom: "37%",
            width: s.width,
            height: "50%",
            background: `linear-gradient(to top, ${s.color}, transparent)`,
            animation: `synth-vline-drift ${s.duration} ease-in-out infinite`,
            animationDelay: s.delay,
          }}
        />
      ))}
    </>
  );
}
