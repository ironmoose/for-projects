/**
 * Global keyframe injector. Renders a single <style> element
 * containing all shared animation keyframes.
 * Respects prefers-reduced-motion.
 */
export function AnimationStyles() {
  return (
    <style>{`
      @keyframes highlight-flash {
        0%   { background-color: var(--activity-flash, rgba(139,209,232,0.09)); }
        100% { background-color: transparent; }
      }

      @keyframes slide-in-left {
        from { opacity: 0; transform: translateX(-12px); }
        to   { opacity: 1; transform: translateX(0); }
      }

      @keyframes scale-bump {
        0%   { transform: scale(1); }
        50%  { transform: scale(1.05); }
        100% { transform: scale(1); }
      }

      @keyframes pulse-alive {
        0%, 100% { opacity: 1; }
        50%      { opacity: 0.5; }
      }

      @keyframes ripple-out {
        from { box-shadow: 0 0 0 0 currentColor; opacity: 0.3; }
        to   { box-shadow: 0 0 0 8px currentColor; opacity: 0; }
      }

      @keyframes toast-in {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      @keyframes shimmer {
        0%   { background-position: -200px 0; }
        100% { background-position: calc(200px + 100%) 0; }
      }

      @keyframes glow-pulse {
        0%, 100% { box-shadow: 0 0 0 0 var(--glow-color, rgba(139,209,232,0.3)); }
        50%      { box-shadow: 0 0 8px 2px var(--glow-color, rgba(139,209,232,0.3)); }
      }

      @keyframes border-pulse {
        0%, 100% { border-color: var(--border-pulse-color, rgba(139,209,232,0.6)); }
        50%      { border-color: var(--border-pulse-dim, rgba(139,209,232,0.2)); }
      }

      @keyframes status-transition {
        0%   { transform: scale(1); filter: brightness(1); }
        30%  { transform: scale(1.3); filter: brightness(1.5); }
        100% { transform: scale(1); filter: brightness(1); }
      }

      @keyframes fade-in-up {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      @keyframes slide-up {
        from { transform: translateY(100%); }
        to   { transform: translateY(0); }
      }

      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        20%      { transform: translateX(-3px); }
        40%      { transform: translateX(3px); }
        60%      { transform: translateX(-2px); }
        80%      { transform: translateX(2px); }
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
      }

      @keyframes synth-grid-scroll {
        from { transform: perspective(500px) rotateX(55deg) translateY(0); }
        to   { transform: perspective(500px) rotateX(55deg) translateY(56px); }
      }

      @keyframes synth-scanline {
        from { transform: translateY(-100%); }
        to   { transform: translateY(100vh); }
      }

      @keyframes synth-sun-breathe {
        0%, 100% { transform: translateX(-50%) scale(1); filter: blur(0px); }
        50%      { transform: translateX(-50%) scale(1.06); filter: blur(2px); }
      }

      @keyframes synth-star-twinkle {
        0%, 100% { opacity: 0.4; }
        50%      { opacity: 1; }
      }

      /* ---- Synth glow color cycling ---- */
      @property --synth-glow {
        syntax: '<color>';
        inherits: true;
        initial-value: #00f0ff;
      }

      @keyframes synth-glow-cycle {
        0%, 100% { --synth-glow: #00f0ff; }
        50%      { --synth-glow: #b44dff; }
      }

      :root[data-synth] {
        animation: synth-glow-cycle 15s ease-in-out infinite;
      }

      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }
    `}</style>
  );
}
