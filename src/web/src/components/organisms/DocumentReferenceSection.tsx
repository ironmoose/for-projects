import { semantic as t } from "@4lt7ab/ui/core";
import { ExpandableCard } from "@4lt7ab/ui/ui";
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
  const label = TYPE_LABELS[type];
  const count = references.length;

  const titleNode = (
    <span style={{ display: "inline-flex", alignItems: "center", gap: t.spaceSm }}>
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
            gap: t.spaceSm,
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
            padding: `${t.spaceLg} ${t.spaceMd}`,
            color: t.colorTextSecondary,
            fontSize: t.fontSizeSm,
            fontFamily: t.fontSans,
            cursor: "pointer",
          }}
          onClick={onAddDocument}
        >
          Link a {label.toLowerCase()} document
        </div>
      ) : (
        <div
          style={{
            padding: `${t.spaceMd} ${t.spaceSm}`,
            color: t.colorTextSecondary,
            fontSize: t.fontSizeSm,
            fontFamily: t.fontSans,
            textAlign: "center",
          }}
        >
          No {label.toLowerCase()} documents linked
        </div>
      )}
    </ExpandableCard>
  );
}
