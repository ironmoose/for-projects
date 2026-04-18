/**
 * DocumentReader — the shared reading modal for a single document.
 *
 * Fetches the document by ID via `useDocument`, renders a serif title, summary,
 * favorite badge, metadata table (folder / tags / source / dates), then the
 * markdown body inside a prose Container.
 *
 * Originally lived inline in `KnowledgeBasePage`. Extracted so both
 * KnowledgeBasePage and ProjectDocumentsPanel can reuse it.
 */

import { useMemo } from "react";
import type { ReactNode } from "react";
import { semantic as t } from "@4lt7ab/ui/core";
import {
  Icon,
  TagChip,
  EmptyState,
  ModalShell,
  MetadataTable,
  Skeleton,
} from "@4lt7ab/ui/ui";
import { Container, Markdown } from "@4lt7ab/ui/content";

import { useDocument } from "../hooks/useDocument";
import { formatShortDate } from "../utils";
import { SolidModalBody } from "./SolidModalBody";

/** Deterministic accent color per folder so cards cluster visually. */
export function folderAccentColor(folder: string | null): string {
  if (!folder) return t.colorBorder;
  const accents = [
    t.colorActionPrimary,
    t.colorInfo,
    t.colorSuccess,
    t.colorWarning,
    t.colorError,
  ];
  let hash = 0;
  for (let i = 0; i < folder.length; i++) hash = ((hash << 5) - hash + folder.charCodeAt(i)) | 0;
  return accents[Math.abs(hash) % accents.length];
}

export function DocumentReader({
  documentId,
  onClose,
}: {
  documentId: string;
  onClose: () => void;
}) {
  const { document: doc, loading, notFound } = useDocument(documentId);

  const metadataItems = useMemo(() => {
    if (!doc) return [];
    const items: Array<{ label: string; value: ReactNode }> = [];

    if (doc.folder) {
      const accent = folderAccentColor(doc.folder);
      items.push({
        label: "Folder",
        value: (
          <span style={{ display: "inline-flex", alignItems: "center", gap: t.spaceXs }}>
            <Icon name="folder" size={14} style={{ color: accent }} />
            {doc.folder}
          </span>
        ),
      });
    }

    if (doc.tags.length > 0) {
      items.push({
        label: "Tags",
        value: (
          <span style={{ display: "inline-flex", gap: t.spaceXs, flexWrap: "wrap" }}>
            {doc.tags.map((tag) => <TagChip key={tag} name={tag} />)}
          </span>
        ),
      });
    }

    if (doc.source_url) {
      items.push({
        label: "Source",
        value: (
          <a
            href={doc.source_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: t.colorTextLink,
              textDecoration: "none",
              fontSize: t.fontSizeSm,
              wordBreak: "break-all",
            }}
          >
            {doc.source_url}
          </a>
        ),
      });
    }

    items.push({ label: "Created", value: formatShortDate(doc.created_at) });
    items.push({ label: "Updated", value: formatShortDate(doc.updated_at) });

    return items;
  }, [doc]);

  return (
    <ModalShell onClose={onClose} maxWidth={800}>
      <SolidModalBody>
        {loading ? (
          <div style={{ padding: t.spaceXl }}>
            <Container width="prose">
              <div style={{ display: "flex", flexDirection: "column", gap: t.spaceMd }}>
                <Skeleton height={36} width="70%" />
                <Skeleton height={18} width="50%" />
                <Skeleton height={1} />
                <Skeleton height={300} />
              </div>
            </Container>
          </div>
        ) : notFound ? (
          <div style={{ padding: t.spaceXl }}>
            <EmptyState icon="error" message="Document not found." />
          </div>
        ) : doc ? (
          <div style={{ padding: `${t.space2xl} 0 ${t.spaceXl}` }}>
            <Container width="prose">
              <header style={{ marginBottom: t.spaceLg }}>
                <h1 style={{
                  margin: 0,
                  fontSize: "clamp(1.5rem, 4vw, 2rem)",
                  fontWeight: 600,
                  fontFamily: t.fontSerif,
                  color: t.colorText,
                  lineHeight: 1.25,
                  letterSpacing: t.letterSpacingTight,
                }}>
                  {doc.title}
                </h1>

                {doc.summary && (
                  <p style={{
                    margin: `${t.spaceMd} 0 0`,
                    fontSize: t.fontSizeLg,
                    fontFamily: t.fontSans,
                    color: t.colorTextSecondary,
                    lineHeight: t.lineHeightRelaxed,
                  }}>
                    {doc.summary}
                  </p>
                )}

                {doc.favorite && (
                  <div style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: t.spaceXs,
                    marginTop: t.spaceMd,
                  }}>
                    <Icon name="star" size={16} style={{ color: t.colorWarning }} />
                    <span style={{
                      fontSize: t.fontSizeXs,
                      fontWeight: 600,
                      color: t.colorWarning,
                      textTransform: "uppercase",
                      letterSpacing: t.letterSpacingWide,
                    }}>
                      Favorite
                    </span>
                  </div>
                )}

                {metadataItems.length > 0 && (
                  <div style={{ marginTop: t.spaceLg }}>
                    <MetadataTable items={metadataItems} />
                  </div>
                )}
              </header>

              <hr style={{
                border: "none",
                borderTop: `1px solid ${t.colorBorder}`,
                margin: `${t.spaceLg} 0`,
              }} />

              {doc.content ? (
                <Markdown>{doc.content}</Markdown>
              ) : (
                <EmptyState icon="article" message="This document has no content yet." variant="card" />
              )}
            </Container>
          </div>
        ) : null}
      </SolidModalBody>
    </ModalShell>
  );
}
