import { useInjectStyles } from "@4lt7ab/ui/core";
import { useTheme } from "../theme/ThemeContext";
import { Card } from "./Card";
import { TagChip } from "./TagChip";
import { IconButton } from "../atoms/IconButton";
import { Badge } from "../atoms/Badge";
import { Icon } from "../atoms/Icon";
import type { ReferenceType, DocumentReferenceDetail } from "../../types";

interface DocumentReferenceCardProps {
  reference: DocumentReferenceDetail & { tags?: string[] };
  onOpen: () => void;
  onDetach?: () => void;
  onChangeType?: (newType: ReferenceType) => void;
}

const TYPE_LABELS: Record<ReferenceType, string> = {
  goal: "Goal",
  plan: "Plan",
  requirements: "Requirements",
  design: "Design",
  reference: "Reference",
  note: "Note",
};

function badgeColorForType(
  type: ReferenceType,
  theme: ReturnType<typeof useTheme>["theme"],
): React.CSSProperties {
  const map: Record<ReferenceType, { bg: string; fg: string }> = {
    goal: { bg: `${theme.color.success}22`, fg: theme.color.success },
    plan: { bg: `${theme.color.primary}22`, fg: theme.color.primary },
    requirements: { bg: `${theme.color.warning}22`, fg: theme.color.warning },
    design: { bg: `${theme.color.tertiary}22`, fg: theme.color.tertiary },
    reference: { bg: theme.color.surfaceContainerHigh, fg: theme.color.textMuted },
    note: { bg: theme.color.surfaceContainerHigh, fg: theme.color.textFaint },
  };
  const c = map[type];
  return { background: c.bg, color: c.fg };
}

export function DocumentReferenceCard({
  reference,
  onOpen,
  onDetach,
}: DocumentReferenceCardProps) {
  const { theme } = useTheme();

  useInjectStyles("tfp-doc-ref", `
    .tfp-doc-ref .tfp-doc-ref-detach {
      opacity: 0;
      transition: opacity 0.15s;
    }
    .tfp-doc-ref:hover .tfp-doc-ref-detach {
      opacity: 1;
    }
    .tfp-doc-ref:focus-visible {
      outline: 2px solid var(--focus-ring-color);
      outline-offset: 2px;
    }
  `);

  const tags = reference.tags ?? [];
  const maxTags = 3;
  const overflowCount = tags.length - maxTags;

  return (
    <Card
      variant="flat"
      padding="sm"
      hover
      className="tfp-doc-ref"
      style={{ cursor: "pointer", position: "relative" }}
      onClick={onOpen}
    >
      {/* Top row: badge + title + detach */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: theme.spacing.sm,
          minHeight: 24,
        }}
      >
        <Badge style={badgeColorForType(reference.type, theme)}>
          {TYPE_LABELS[reference.type]}
        </Badge>

        {reference.favorite && (
          <Icon
            name="star"
            size={14}
            style={{ color: theme.color.warning, flexShrink: 0 }}
          />
        )}

        <span
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: theme.font.size.sm,
            fontWeight: 600,
            fontFamily: theme.font.body,
            color: theme.color.text,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {reference.title}
        </span>

        {onDetach && (
          <span className="tfp-doc-ref-detach">
            <IconButton
              icon="close"
              size={14}
              onClick={(e) => {
                e.stopPropagation();
                onDetach();
              }}
              aria-label="Detach document"
              style={{
                width: 24,
                height: 24,
                minWidth: 24,
                flexShrink: 0,
                color: theme.color.textFaint,
              }}
            />
          </span>
        )}
      </div>

      {/* Summary */}
      {reference.summary && (
        <div
          style={{
            fontSize: theme.font.size.xs,
            color: theme.color.textMuted,
            fontFamily: theme.font.body,
            lineHeight: theme.font.lineHeight.normal,
            marginTop: theme.spacing.xs,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical" as React.CSSProperties["WebkitBoxOrient"],
            overflow: "hidden",
          }}
        >
          {reference.summary}
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            flexWrap: "wrap",
            marginTop: theme.spacing.xs,
          }}
        >
          {tags.slice(0, maxTags).map((tag) => (
            <TagChip key={tag} name={tag} />
          ))}
          {overflowCount > 0 && (
            <span
              style={{
                fontSize: theme.font.size.xxs,
                color: theme.color.textFaint,
              }}
            >
              +{overflowCount}
            </span>
          )}
        </div>
      )}
    </Card>
  );
}
