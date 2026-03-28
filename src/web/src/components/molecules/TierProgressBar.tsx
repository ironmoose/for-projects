import { useTheme } from "../theme/ThemeContext";

interface TierProgressBarProps {
  tiers: Array<{ rank: number; progress: { done: number; total: number }; complete: boolean }>;
  compact?: boolean;
  style?: React.CSSProperties;
}

export function TierProgressBar({ tiers, compact, style }: TierProgressBarProps) {
  const { theme } = useTheme();
  const height = compact ? 8 : 16;

  // Determine tier state: active = first non-complete after all previous complete
  function getTierState(index: number): "complete" | "active" | "locked" {
    if (tiers[index].complete) return "complete";
    const allPreviousComplete = tiers.slice(0, index).every((t) => t.complete);
    return allPreviousComplete ? "active" : "locked";
  }

  function getFillColor(state: "complete" | "active" | "locked"): string {
    switch (state) {
      case "complete":
        return theme.color.success;
      case "active":
        return theme.color.tertiary;
      case "locked":
        return theme.color.borderSubtle;
    }
  }

  return (
    <div
      style={{
        display: "flex",
        gap: 2,
        height,
        borderRadius: height / 2,
        overflow: "hidden",
        ...style,
      }}
    >
      {tiers.map((tier, i) => {
        const state = getTierState(i);
        const pct = tier.progress.total === 0
          ? (tier.complete ? 100 : 0)
          : (tier.progress.done / tier.progress.total) * 100;
        const fillColor = getFillColor(state);

        return (
          <div
            key={tier.rank}
            title={`Tier ${tier.rank}: ${tier.progress.done}/${tier.progress.total} complete`}
            style={{
              flex: 1,
              background: theme.color.surfaceContainerHigh,
              borderRadius: height / 2,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: "100%",
                background: fillColor,
                borderRadius: height / 2,
                transition: "width 0.3s ease",
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
