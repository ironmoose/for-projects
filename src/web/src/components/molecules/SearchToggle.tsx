import { useEffect, useRef, useState } from "react";
import { Icon } from "../atoms/Icon";
import { useTheme } from "../theme/ThemeContext";
import { sg } from "../theme/synthGlow";

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

const TOGGLE_SIZE = 30;
const PADDING_H = 10;
const GAP = 6;

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
  const { theme, themeName } = useTheme();
  const isSynth = themeName === "synth";
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
  const toggleOffset = showToggle ? TOGGLE_SIZE + GAP : 0;

  // Colors
  const borderColor = focused
    ? isSynth ? sg(53) : theme.color.primary
    : isSynth ? sg(14) : theme.color.borderSubtle;
  const focusShadow = focused
    ? isSynth ? `0 0 12px ${sg(19)}, inset 0 0 6px ${sg(5)}` : `0 0 0 2px ${theme.color.primary}30`
    : isSynth ? `0 0 4px ${sg(6)}` : "none";

  const toggleColor = semantic
    ? theme.color.primary
    : theme.color.textMuted;
  const toggleBg = semantic
    ? `${theme.color.primary}20`
    : `${theme.color.textFaint}15`;

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
      {/* Input field */}
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
          paddingRight: showToggle ? toggleOffset + PADDING_H : PADDING_H,
          minWidth: 0,
        }}
      />

      {/* Toggle button — pinned right, icon swaps in place */}
      {showToggle && (
        <button
          type="button"
          onClick={() => onSemanticChange(!semantic)}
          title={semantic ? "Switch to keyword search" : "Switch to semantic search"}
          aria-label={semantic ? "Switch to keyword search" : "Switch to semantic search"}
          style={{
            position: "absolute",
            top: 3,
            right: 4,
            width: TOGGLE_SIZE,
            height: TOGGLE_SIZE,
            borderRadius: theme.radius.md,
            border: "none",
            background: toggleBg,
            color: toggleColor,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.2s, color 0.2s",
            zIndex: 2,
            padding: 0,
            flexShrink: 0,
          }}
        >
          <Icon name={semantic ? "neurology" : "search"} size={16} />
        </button>
      )}
    </div>
  );
}
