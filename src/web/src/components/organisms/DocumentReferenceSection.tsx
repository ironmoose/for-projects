import { useTheme } from "../theme/ThemeContext";
import { ExpandableCard } from "../molecules/ExpandableCard";
import { DocumentReferenceCard } from "../molecules/DocumentReferenceCard";
import { Badge } from "../atoms/Badge";
import { IconButton } from "../atoms/IconButton";
import type { ReferenceType, DocumentReferenceDetail } from "../../types";

interface DocumentReferenceSectionProps {
  type: ReferenceType;
  references: DocumentReferenceDetail[];
  onOpenDocument: (documentId: string) => void;
  onDetachDocument?: (documentId: string) => void;
  onAddDocument?: () => void;
  defaultOpen?: boolean;
}

const TYPE_LABELS: Record<ReferenceType, string> = {
  goal: "Goal",
  plan: "Plan",
  requirements: "Requirements",
  design: "Design",
  reference: "Reference",
  note: "Note",
};

export function DocumentReferenceSection({
  type,
  references,
  onOpenDocument,
  onDetachDocument,
  onAddDocument,
  defaultOpen = false,
}: DocumentReferenceSectionProps) {
  const { theme } = useTheme();

  const label = TYPE_LABELS[type];
  const count = references.length;

  const titleNode = (
    <span style={{ display: "inline-flex", alignItems: "center", gap: theme.spacing.sm }}>
      {label}
      {count > 0 && (
        <Badge variant="default">
          {count}
        </Badge>
      )}
    </span>
  );

  const headerAction = onAddDocument ? (
    <IconButton
      icon="add"
      size={16}
      onClick={onAddDocument}
      aria-label={`Add ${label.toLowerCase()} document`}
      style={{ width: 28, height: 28, minWidth: 28 }}
    />
  ) : undefined;

  return (
    <ExpandableCard
      title={`${label}${count > 0 ? ` (${count})` : ""}`}
      defaultOpen={defaultOpen}
      headerAction={headerAction}
    >
      {references.length > 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing.sm,
          }}
        >
          {references.map((ref) => (
            <DocumentReferenceCard
              key={`${ref.document_id}-${ref.type}`}
              reference={ref}
              onOpen={() => onOpenDocument(ref.document_id)}
              onDetach={
                onDetachDocument
                  ? () => onDetachDocument(ref.document_id)
                  : undefined
              }
            />
          ))}
        </div>
      ) : onAddDocument ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: `${theme.spacing.lg} ${theme.spacing.md}`,
            color: theme.color.textFaint,
            fontSize: theme.font.size.sm,
            fontFamily: theme.font.body,
            cursor: "pointer",
          }}
          onClick={onAddDocument}
        >
          Link a {label.toLowerCase()} document
        </div>
      ) : (
        <div
          style={{
            padding: `${theme.spacing.md} ${theme.spacing.sm}`,
            color: theme.color.textFaint,
            fontSize: theme.font.size.sm,
            fontFamily: theme.font.body,
            textAlign: "center",
          }}
        >
          No {label.toLowerCase()} documents linked
        </div>
      )}
    </ExpandableCard>
  );
}
