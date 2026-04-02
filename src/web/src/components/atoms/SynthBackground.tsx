import { useEffect, useMemo, useRef } from "react";
import { useTheme } from "../theme/ThemeContext";

/**
 * Synthwave background — deep space starfield, glowing sun with atmospheric
 * haze bands, and subtle full-screen strobe pulses.
 * The components themselves carry the neon energy via cycling glows.
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
        background: "#06020f",
      }}
    >
      {/* Stars — full screen */}
      <Stars />

      {/* Sun — gradient circle with haze/fog bands */}
      <div
        style={{
          position: "absolute",
          bottom: "36%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 180,
          height: 180,
          borderRadius: "50%",
          background: "linear-gradient(to bottom, #ff2d95 0%, #ff4d6d 20%, #ff6b35 45%, #ffaa33 70%, #ffe44d 100%)",
          boxShadow: "0 0 80px 30px rgba(255,45,149,0.30), 0 0 160px 60px rgba(255,107,53,0.15), 0 0 300px 100px rgba(255,45,149,0.08)",
          animation: "synth-sun-breathe 8s ease-in-out infinite",
          overflow: "hidden",
        }}
      >
        {/* Haze bands — soft blurred horizontal fog lines for hot sunset look */}
        <div style={{ position: "absolute", left: "-10%", right: "-10%", top: "18%", height: "8%",
          background: "linear-gradient(to bottom, transparent, rgba(255,140,60,0.55) 30%, rgba(255,200,100,0.4) 50%, rgba(255,140,60,0.55) 70%, transparent)",
          filter: "blur(3px)",
        }} />
        <div style={{ position: "absolute", left: "-10%", right: "-10%", top: "32%", height: "6%",
          background: "linear-gradient(to bottom, transparent, rgba(255,100,50,0.5) 30%, rgba(255,170,80,0.35) 50%, rgba(255,100,50,0.5) 70%, transparent)",
          filter: "blur(4px)",
        }} />
        <div style={{ position: "absolute", left: "-10%", right: "-10%", top: "44%", height: "10%",
          background: "linear-gradient(to bottom, transparent, rgba(200,60,30,0.5) 20%, rgba(140,40,60,0.6) 50%, rgba(200,60,30,0.5) 80%, transparent)",
          filter: "blur(5px)",
        }} />
        <div style={{ position: "absolute", left: "-10%", right: "-10%", top: "58%", height: "7%",
          background: "linear-gradient(to bottom, transparent, rgba(180,50,40,0.5) 30%, rgba(120,30,50,0.55) 50%, rgba(180,50,40,0.5) 70%, transparent)",
          filter: "blur(4px)",
        }} />
        <div style={{ position: "absolute", left: "-10%", right: "-10%", top: "68%", height: "12%",
          background: "linear-gradient(to bottom, transparent, rgba(100,20,40,0.6) 20%, rgba(60,10,30,0.7) 50%, rgba(100,20,40,0.6) 80%, transparent)",
          filter: "blur(6px)",
        }} />
        <div style={{ position: "absolute", left: "-10%", right: "-10%", top: "82%", height: "8%",
          background: "linear-gradient(to bottom, transparent, rgba(80,15,35,0.55) 30%, rgba(50,8,25,0.6) 50%, rgba(80,15,35,0.55) 70%, transparent)",
          filter: "blur(5px)",
        }} />
      </div>

      {/* Sun radial glow — large soft halo behind the sun */}
      <div
        style={{
          position: "absolute",
          bottom: "25%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "60vw",
          height: "40vh",
          borderRadius: "50%",
          background: "radial-gradient(ellipse at 50% 50%, rgba(255,45,149,0.08) 0%, rgba(255,107,53,0.05) 30%, rgba(255,45,149,0.02) 60%, transparent 80%)",
          filter: "blur(40px)",
          pointerEvents: "none",
        }}
      />

      {/* Rolling sine wave across the horizon */}
      <SynthWave />

      {/* Perspective grid — single-color lines, no fill glow */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: "-50%",
          width: "200%",
          height: "55%",
          transformOrigin: "center bottom",
          transform: "perspective(500px) rotateX(55deg)",
          backgroundImage: `
            linear-gradient(to right, rgba(255,100,90,0.35) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,100,90,0.35) 1px, transparent 1px)
          `,
          backgroundSize: "56px 56px",
          animation: "synth-grid-scroll 2.5s linear infinite",
          maskImage: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.15) 70%, transparent 90%)",
          WebkitMaskImage: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.15) 70%, transparent 90%)",
        }}
      />

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

/** Deterministic star field — scattered dots with staggered twinkle across full screen. */
function Stars() {
  const stars = useMemo(() => {
    // Dense starfield covering the entire viewport
    const seed = [
      [8, 12], [23, 5], [45, 18], [67, 8], [82, 22], [15, 24], [38, 7],
      [55, 20], [72, 14], [91, 19], [5, 20], [29, 3], [50, 10], [76, 23],
      [88, 6], [12, 21], [42, 15], [63, 2], [35, 22], [58, 9], [95, 16],
      [18, 8], [47, 22], [70, 4], [83, 22], [26, 14], [53, 20], [9, 17],
      [61, 11], [78, 21], [33, 6], [44, 23], [86, 10], [20, 18], [66, 21],
      // Extra stars filling the lower half too
      [14, 45], [37, 55], [62, 48], [85, 60], [8, 70], [48, 65], [73, 75],
      [25, 80], [55, 85], [90, 50], [42, 90], [68, 95], [16, 58], [94, 42],
      [31, 72], [77, 88], [3, 52], [59, 38], [46, 78], [81, 68], [22, 92],
      [65, 55], [11, 35], [38, 42], [52, 30], [87, 38], [71, 82], [19, 62],
    ];
    return seed.map(([x, y], i) => ({
      left: `${x}%`,
      top: `${y}%`,
      size: i % 5 === 0 ? 2.5 : i % 3 === 0 ? 2 : 1,
      delay: `${(i * 0.7) % 5}s`,
      duration: `${2 + (i % 3)}s`,
      color: i % 5 === 0 ? "rgba(0,240,255,0.9)" : i % 7 === 0 ? "rgba(255,45,149,0.8)" : i % 11 === 0 ? "rgba(57,255,20,0.8)" : "rgba(255,255,255,0.8)",
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
            boxShadow: s.size > 1.5 ? `0 0 6px 2px ${s.color}` : s.size > 1 ? `0 0 4px 1px ${s.color}` : undefined,
            animation: `synth-star-twinkle ${s.duration} ease-in-out infinite`,
            animationDelay: s.delay,
          }}
        />
      ))}
    </>
  );
}

/**
 * Rolling sine wave that drifts across the center of the screen at the sun's
 * horizon. Drawn on a canvas with a warm synthwave gradient stroke that shifts
 * slowly over time. Layered with a second wave slightly offset for depth.
 */
function SynthWave() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    let t = 0;

    const tick = () => {
      const w = canvas.width;
      const h = canvas.height;
      t += 0.008;

      ctx.clearRect(0, 0, w, h);

      // Center Y — aligned with the sun area (roughly 36% from bottom = 64% from top)
      const centerY = h * 0.64;

      // Draw two layered waves for depth
      drawWave(ctx, w, centerY, t, 30, 0.003, 2.5, [
        { pos: 0, color: "rgba(255,45,149,0.5)" },
        { pos: 0.3, color: "rgba(255,120,60,0.45)" },
        { pos: 0.6, color: "rgba(255,45,149,0.4)" },
        { pos: 1, color: "rgba(255,80,100,0.3)" },
      ]);

      drawWave(ctx, w, centerY, t * 0.7 + 1.5, 20, 0.004, 1.5, [
        { pos: 0, color: "rgba(255,80,100,0.25)" },
        { pos: 0.5, color: "rgba(255,140,70,0.2)" },
        { pos: 1, color: "rgba(255,60,120,0.15)" },
      ]);

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
      }}
    />
  );
}

function drawWave(
  ctx: CanvasRenderingContext2D,
  w: number,
  centerY: number,
  time: number,
  amplitude: number,
  frequency: number,
  lineWidth: number,
  gradientStops: { pos: number; color: string }[],
) {
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  for (const s of gradientStops) grad.addColorStop(s.pos, s.color);

  ctx.beginPath();
  for (let x = 0; x <= w; x += 2) {
    // Compound sine for organic movement
    const y =
      centerY +
      Math.sin(x * frequency + time) * amplitude +
      Math.sin(x * frequency * 2.3 + time * 1.4) * (amplitude * 0.3) +
      Math.sin(x * frequency * 0.5 + time * 0.6) * (amplitude * 0.5);
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }

  ctx.strokeStyle = grad;
  ctx.lineWidth = lineWidth;
  ctx.shadowColor = "rgba(255,80,120,0.3)";
  ctx.shadowBlur = 12;
  ctx.stroke();
  ctx.shadowBlur = 0;
}

