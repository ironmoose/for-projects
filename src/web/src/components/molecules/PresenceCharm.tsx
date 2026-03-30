import { useTheme } from "../theme/ThemeContext";

export interface PresenceCharmProps {
  active: boolean;
  label: string;
  color?: string;
}

export function PresenceCharm({ active, label, color }: PresenceCharmProps) {
  const { theme } = useTheme();
  const fill = active ? (color ?? theme.color.primary) : theme.color.borderSubtle;

  return (
    <span
      title={label}
      aria-label={`${label}: ${active ? "present" : "empty"}`}
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: fill,
        opacity: active ? 1 : 0.3,
        transition: `background ${theme.animation.duration.fast} ${theme.animation.easing.default}, opacity ${theme.animation.duration.fast} ${theme.animation.easing.default}`,
      }}
    />
  );
}
