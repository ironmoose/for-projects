import { useInjectStyles, semantic as t } from "@4lt7ab/ui/core";
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

function alpha(token: string, pct: number): string {
  return `color-mix(in srgb, ${token} ${pct}%, transparent)`;
}

const TYPE_BADGE_STYLES: Record<ReferenceType, React.CSSProperties> = {
  goal: { background: alpha(t.colorSuccess, 13), color: t.colorSuccess },
  plan: { background: alpha(t.colorActionPrimary, 13), color: t.colorActionPrimary },
  requirements: { background: alpha(t.colorWarning, 13), color: t.colorWarning },
  design: { background: alpha(t.colorWarning, 13), color: t.colorWarning },
  reference: { background: t.colorSurfaceRaised, color: t.colorTextMuted },
  note: { background: t.colorSurfaceRaised, color: t.colorTextSecondary },
};

export function DocumentReferenceCard({
  reference,
  onOpen,
  onDetach,
}: DocumentReferenceCardProps) {
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
          gap: t.spaceSm,
          minHeight: 24,
        }}
      >
        <Badge style={TYPE_BADGE_STYLES[reference.type]}>
          {TYPE_LABELS[reference.type]}
        </Badge>

        {reference.favorite && (
          <Icon
            name="star"
            size={14}
            style={{ color: t.colorWarning, flexShrink: 0 }}
          />
        )}

        <span
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: t.fontSizeSm,
            fontWeight: 600,
            fontFamily: t.fontSans,
            color: t.colorText,
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
                color: t.colorTextSecondary,
              }}
            />
          </span>
        )}
      </div>

      {/* Summary */}
      {reference.summary && (
        <div
          style={{
            fontSize: t.fontSizeXs,
            color: t.colorTextMuted,
            fontFamily: t.fontSans,
            lineHeight: t.lineHeightBase,
            marginTop: t.spaceXs,
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
            marginTop: t.spaceXs,
          }}
        >
          {tags.slice(0, maxTags).map((tag) => (
            <TagChip key={tag} name={tag} />
          ))}
          {overflowCount > 0 && (
            <span
              style={{
                fontSize: t.fontSizeXs,
                color: t.colorTextSecondary,
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
