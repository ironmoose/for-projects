/**
 * ProjectDocumentsPanel — documents linked to a project, grouped by reference type.
 *
 * Source: `DocumentReferenceDetail[]` from `useProject().project.documents`.
 * Each non-empty reference type gets a SectionLabel + Grid of compact cards.
 * A single document that appears under multiple types renders in each section.
 *
 * Clicking / pressing Enter / Space on a card opens the shared `DocumentReader`
 * modal for that document. No filtering, search, or writes — those land in
 * follow-up tasks (count badge, filters, chips, attach, detach, flip-through).
 *
 * UI dependencies: @4lt7ab/ui only. Inline styles via semantic tokens.
 */

import { useMemo, useState } from "react";
import { semantic as t } from "@4lt7ab/ui/core";
import {
  Icon,
  Grid,
  EmptyState,
  SectionLabel,
  Badge,
} from "@4lt7ab/ui/ui";

import type { DocumentReferenceDetail, DocumentReferenceType } from "../types";
import { DOCUMENT_REFERENCE_TYPES } from "../types";
import { DocumentReader } from "./DocumentReader";

// ---------------------------------------------------------------------------
// Section metadata — icon + human label per reference type
// ---------------------------------------------------------------------------

interface ReferenceTypeMeta {
  label: string;
  icon: string;
  /** Accent used for the card icon glyph. Tokens only. */
  accent: string;
}

const REFERENCE_TYPE_META: Record<DocumentReferenceType, ReferenceTypeMeta> = {
  goal: { label: "Goals", icon: "flag", accent: t.colorSuccess },
  plan: { label: "Plans", icon: "checklist", accent: t.colorInfo },
  requirements: { label: "Requirements", icon: "rule", accent: t.colorWarning },
  design: { label: "Design", icon: "architecture", accent: t.colorActionPrimary },
  reference: { label: "References", icon: "bookmark", accent: t.colorTextSecondary },
  note: { label: "Notes", icon: "sticky_note_2", accent: t.colorTextMuted },
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ProjectDocumentsPanelProps {
  /** Raw reference list from `get_project`. */
  references: DocumentReferenceDetail[];
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export function ProjectDocumentsPanel({ references }: ProjectDocumentsPanelProps) {
  const [openDocId, setOpenDocId] = useState<string | null>(null);

  // Group references by type in the canonical order so empty groups stay hidden
  // but filled ones always render in the same sequence.
  const grouped = useMemo(() => {
    const byType: Record<DocumentReferenceType, DocumentReferenceDetail[]> = {
      goal: [], plan: [], requirements: [], design: [], reference: [], note: [],
    };
    for (const ref of references) {
      byType[ref.type].push(ref);
    }
    return byType;
  }, [references]);

  const hasAny = references.length > 0;

  if (!hasAny) {
    return (
      <EmptyState
        icon="menu_book"
        message="No documents linked yet. Attach one from your knowledgebase to get started."
      />
    );
  }

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: t.spaceLg }}>
        {DOCUMENT_REFERENCE_TYPES.map((type) => {
          const items = grouped[type];
          if (items.length === 0) return null;
          const meta = REFERENCE_TYPE_META[type];
          return (
            <section
              key={type}
              aria-labelledby={`project-docs-section-${type}`}
              style={{ display: "flex", flexDirection: "column", gap: t.spaceSm }}
            >
              <div id={`project-docs-section-${type}`}>
                <SectionLabel>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: t.spaceXs }}>
                    <Icon name={meta.icon} size={14} />
                    {meta.label}
                    <Badge variant="default">{items.length}</Badge>
                  </span>
                </SectionLabel>
              </div>
              <Grid minColumnWidth={260} gap="sm">
                {items.map((ref) => (
                  <DocumentReferenceCard
                    key={`${ref.document_id}:${ref.type}`}
                    reference={ref}
                    onOpen={() => setOpenDocId(ref.document_id)}
                  />
                ))}
              </Grid>
            </section>
          );
        })}
      </div>

      {openDocId && (
        <DocumentReader
          documentId={openDocId}
          onClose={() => setOpenDocId(null)}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Document reference card
// ---------------------------------------------------------------------------

function DocumentReferenceCard({
  reference,
  onOpen,
}: {
  reference: DocumentReferenceDetail;
  onOpen: () => void;
}) {
  const meta = REFERENCE_TYPE_META[reference.type];
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      aria-label={`Open ${reference.title}`}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: t.spaceXs,
        padding: t.spaceMd,
        borderRadius: t.radiusLg,
        border: `1px solid ${t.colorBorder}`,
        background: t.colorSurfaceSolid,
        boxShadow: t.shadowSm,
        cursor: "pointer",
        minWidth: 0,
        transition: "transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.borderColor = t.colorBorderFocused;
        e.currentTarget.style.boxShadow = t.shadowMd;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.borderColor = t.colorBorder;
        e.currentTarget.style.boxShadow = t.shadowSm;
      }}
    >
      {/* Title row: type icon + title + favorite star */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: t.spaceXs, minWidth: 0 }}>
        <Icon
          name={meta.icon}
          size={14}
          style={{ color: meta.accent, flexShrink: 0, marginTop: 3 }}
        />
        <h3 style={{
          margin: 0,
          flex: 1,
          minWidth: 0,
          fontSize: t.fontSizeSm,
          fontWeight: 700,
          fontFamily: t.fontSans,
          color: t.colorText,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {reference.title}
        </h3>
        {reference.favorite && (
          <Icon
            name="star"
            size={14}
            style={{ color: t.colorWarning, flexShrink: 0, marginTop: 3 }}
            aria-label="Favorite"
          />
        )}
      </div>

      {/* Summary — 2-line clamp */}
      {reference.summary ? (
        <p style={{
          margin: 0,
          fontSize: t.fontSizeXs,
          color: t.colorTextMuted,
          lineHeight: t.lineHeightRelaxed,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}>
          {reference.summary}
        </p>
      ) : (
        <p style={{
          margin: 0,
          fontSize: t.fontSizeXs,
          color: `color-mix(in srgb, ${t.colorTextMuted} 50%, transparent)`,
          fontStyle: "italic",
        }}>
          No summary
        </p>
      )}

      {/* Type badge — small visual anchor, useful once filters collapse groups */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: t.spaceXs }}>
        <Badge variant="default">{meta.label.toLowerCase()}</Badge>
      </div>
    </div>
  );
}
