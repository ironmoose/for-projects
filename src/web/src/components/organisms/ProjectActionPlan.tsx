import { useState } from "react";
import { useTheme } from "../theme/ThemeContext";
import { Skeleton } from "../atoms/Skeleton";
import { Badge } from "../atoms/Badge";
import { Icon } from "../atoms/Icon";
import { ActionCard } from "../molecules/ActionCard";
import { TierProgressBar } from "../molecules/TierProgressBar";
import { useProjectActions } from "../../hooks";
import type { ActionStatus } from "../../types";

interface ProjectActionPlanProps {
  projectId: string;
  defaultExpanded?: boolean;
  style?: React.CSSProperties;
}

export function ProjectActionPlan({ projectId, defaultExpanded, style }: ProjectActionPlanProps) {
  const { theme } = useTheme();
  const { tiers, loading, updateStatus } = useProjectActions(projectId);
  const [expanded, setExpanded] = useState(defaultExpanded ?? false);

  if (loading) {
    return (
      <div style={{ ...style }}>
        <Skeleton width="100%" height={48} />
      </div>
    );
  }

  if (tiers.length === 0) {
    return null;
  }

  const totalActions = tiers.reduce((sum, t) => sum + t.actions.length, 0);
  const totalDone = tiers.reduce((sum, t) => sum + t.progress.done, 0);

  function handleStatusChange(actionId: string) {
    return (status: ActionStatus) => updateStatus(actionId, status);
  }

  return (
    <div style={style}>
      {/* Header - always visible, clickable to toggle */}
      <button
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        aria-label={expanded ? "Collapse action plan" : "Expand action plan"}
        style={{
          display: "flex",
          alignItems: "center",
          gap: theme.spacing.md,
          width: "100%",
          padding: `${theme.spacing.md} ${theme.spacing.lg}`,
          background: theme.color.surfaceContainer,
          border: `1px solid ${theme.color.borderSubtle}`,
          borderRadius: theme.radius.xl,
          cursor: "pointer",
          fontFamily: theme.font.body,
          textAlign: "left",
        }}
      >
        <span
          style={{
            fontSize: theme.font.size.sm,
            fontWeight: 700,
            color: theme.color.text,
            whiteSpace: "nowrap",
          }}
        >
          Action Plan
        </span>

        <Badge variant="default">
          {totalDone}/{totalActions} complete
        </Badge>

        <div style={{ flex: 1, minWidth: 40 }}>
          <TierProgressBar tiers={tiers} compact />
        </div>

        <Icon
          name={expanded ? "expand_less" : "expand_more"}
          size={20}
          color={theme.color.textMuted}
        />
      </button>

      {/* Expanded content */}
      {expanded && (
        <div
          style={{
            marginTop: theme.spacing.md,
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing.lg,
          }}
        >
          {tiers.map((tier) => (
            <div key={tier.rank}>
              {/* Tier header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: theme.spacing.sm,
                  marginBottom: theme.spacing.sm,
                  opacity: tier.complete ? 0.5 : 1,
                }}
              >
                <span
                  style={{
                    fontSize: theme.font.size.xs,
                    fontWeight: 700,
                    color: theme.color.text,
                    fontFamily: theme.font.mono,
                  }}
                >
                  Tier {tier.rank}
                </span>
                <Badge variant={tier.complete ? "complete" : "default"}>
                  {tier.progress.done}/{tier.progress.total}
                </Badge>
              </div>

              {/* Tier actions */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: theme.spacing.sm,
                  opacity: tier.complete ? 0.5 : 1,
                }}
              >
                {tier.actions.map((action) => (
                  <ActionCard
                    key={action.id}
                    action={action}
                    onStatusChange={handleStatusChange(action.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
