import { useEffect, useRef, useState } from "react";
import { Icon } from "../atoms/Icon";
import { useTheme } from "../theme/ThemeContext";

interface SearchToggleProps {
  value: string;
  onChange: (value: string) => void;
  semantic: boolean;
  onSemanticChange: (v: boolean) => void;
  /** Hide the toggle entirely (e.g. backend doesn't support semantic search). */
  toggleVisible?: boolean;
  placeholder?: string;
  semanticPlaceholder?: string;
  debounceMs?: number;
}

const PADDING_H = 10;
const PILL_H = 28;
const PILL_W = 28;
const TOGGLE_GAP = 2;
const TOGGLE_PAD = 3;
const TOGGLE_W = PILL_W * 2 + TOGGLE_GAP + TOGGLE_PAD * 2;

export function SearchToggle({
  value,
  onChange,
  semantic,
  onSemanticChange,
  toggleVisible = true,
  placeholder = "Search...",
  semanticPlaceholder = "Semantic search...",
  debounceMs = 350,
}: SearchToggleProps) {
  const { theme } = useTheme();
  const [localValue, setLocalValue] = useState(value);
  const [focused, setFocused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setLocalValue(value); }, [value]);

  function handleInput(v: string) {
    setLocalValue(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(v), debounceMs);
  }

  const showToggle = toggleVisible;

  // Colors — glow tokens resolve to animated synth values or static fallbacks
  const borderColor = focused
    ? (theme.glow.animated ? theme.glow.borderStrong : theme.color.primary)
    : (theme.glow.animated ? theme.glow.borderSubtle : theme.color.borderSubtle);
  const focusShadow = focused
    ? (theme.glow.animated ? theme.glow.focusRing : `0 0 0 2px ${theme.color.primary}30`)
    : (theme.glow.animated ? theme.glow.focusRingSubtle : "none");

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        height: 38,
        borderRadius: theme.radius.lg,
        border: `1px solid ${borderColor}`,
        background: theme.color.surfaceContainerHigh,
        transition: "border-color 0.15s, box-shadow 0.2s",
        boxShadow: focusShadow,
        overflow: "hidden",
      }}
    >
      <input
        type="text"
        value={localValue}
        onChange={(e) => handleInput(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={semantic ? semanticPlaceholder : placeholder}
        style={{
          flex: 1,
          height: "100%",
          border: "none",
          outline: "none",
          background: "transparent",
          color: theme.color.text,
          fontFamily: theme.font.body,
          fontSize: theme.font.size.sm,
          paddingLeft: PADDING_H,
          paddingRight: showToggle ? TOGGLE_W + PADDING_H + 4 : PADDING_H,
          minWidth: 0,
        }}
      />

      {/* Inline segmented toggle — two icons with a sliding pill */}
      {showToggle && (
        <div
          style={{
            position: "absolute",
            right: 4,
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            alignItems: "center",
            height: PILL_H + TOGGLE_PAD * 2,
            borderRadius: theme.radius.md,
            background: `${theme.color.textFaint}10`,
            padding: TOGGLE_PAD,
            gap: TOGGLE_GAP,
          }}
        >
          {/* Sliding pill */}
          <div
            style={{
              position: "absolute",
              top: TOGGLE_PAD,
              left: semantic
                ? TOGGLE_PAD + PILL_W + TOGGLE_GAP
                : TOGGLE_PAD,
              width: PILL_W,
              height: PILL_H,
              borderRadius: theme.radius.md - 1,
              background: theme.glow.animated ? theme.glow.borderSubtle : `${theme.color.primary}18`,
              border: `1px solid ${theme.glow.animated ? theme.glow.borderLight : `${theme.color.primary}30`}`,
              transition: "left 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
              zIndex: 0,
            }}
          />

          {/* Keyword */}
          <button
            type="button"
            onClick={() => onSemanticChange(false)}
            title="Keyword search"
            aria-label="Keyword search"
            aria-pressed={!semantic}
            style={{
              position: "relative",
              zIndex: 1,
              width: PILL_W,
              height: PILL_H,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              background: "transparent",
              color: !semantic ? theme.color.primary : theme.color.textMuted,
              cursor: "pointer",
              transition: "color 0.2s",
              padding: 0,
              borderRadius: theme.radius.md - 1,
            }}
          >
            <Icon name="search" size={15} />
          </button>

          {/* Semantic */}
          <button
            type="button"
            onClick={() => onSemanticChange(true)}
            title="Semantic search"
            aria-label="Semantic search"
            aria-pressed={semantic}
            style={{
              position: "relative",
              zIndex: 1,
              width: PILL_W,
              height: PILL_H,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              background: "transparent",
              color: semantic ? theme.color.primary : theme.color.textMuted,
              cursor: "pointer",
              transition: "color 0.2s",
              padding: 0,
              borderRadius: theme.radius.md - 1,
            }}
          >
            <Icon name="neurology" size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
