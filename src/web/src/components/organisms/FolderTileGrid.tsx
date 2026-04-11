import { useMemo, useState } from "react";
import { Icon } from "../atoms/Icon";
import { useTheme } from "../theme/ThemeContext";
import { useWindowWidth, SMALL_BREAKPOINT } from "../../hooks/useWindowWidth";
import type { DocumentSummary } from "../../types";
import { formatDate } from "../../utils";

interface FolderTileGridProps {
  documents: DocumentSummary[];
  /** Current path prefix — empty string means root level */
  currentPath: string;
  onNavigate: (path: string) => void;
  /** Called when "Unfiled" is selected */
  onSelectUnfiled: () => void;
}

interface FolderEntry {
  /** The segment name shown on the tile (e.g., "src") */
  name: string;
  /** Full path including this segment (e.g., "facebook-react/src") */
  fullPath: string;
  /** Total documents at or below this path */
  totalDocs: number;
  /** Direct documents at exactly this path */
  directDocs: number;
  /** Number of subfolders */
  subfolderCount: number;
  latestUpdate: string;
  hasSource: boolean;
}

/**
 * Given documents and a current path, compute:
 * - Immediate child folders (next segment) with aggregated stats
 * - Documents at exactly this path level
 * - Unfiled documents (only at root level)
 */
function computeLevel(documents: DocumentSummary[], currentPath: string) {
  const prefix = currentPath ? currentPath + "/" : "";
  const subfolderMap = new Map<string, { totalDocs: number; directDocs: number; subfolders: Set<string>; latestUpdate: string; hasSource: boolean }>();
  const directDocs: DocumentSummary[] = [];
  const unfiledDocs: DocumentSummary[] = [];

  for (const doc of documents) {
    if (!doc.folder) {
      if (!currentPath) unfiledDocs.push(doc);
      continue;
    }

    if (currentPath && doc.folder !== currentPath && !doc.folder.startsWith(prefix)) {
      continue; // Not under current path
    }

    if (doc.folder === currentPath) {
      // Document at exactly this level
      directDocs.push(doc);
      continue;
    }

    // Get the remaining path after the prefix
    const remaining = currentPath ? doc.folder.slice(prefix.length) : doc.folder;
    if (!remaining) {
      directDocs.push(doc);
      continue;
    }

    const segments = remaining.split("/");
    const nextSegment = segments[0];
    const fullPath = prefix + nextSegment;

    let entry = subfolderMap.get(nextSegment);
    if (!entry) {
      entry = { totalDocs: 0, directDocs: 0, subfolders: new Set(), latestUpdate: doc.updated_at, hasSource: false };
      subfolderMap.set(nextSegment, entry);
    }

    entry.totalDocs++;
    if (segments.length === 1) {
      entry.directDocs++;
    } else {
      // Track unique deeper subfolders
      entry.subfolders.add(segments[1]);
    }
    if (doc.updated_at > entry.latestUpdate) entry.latestUpdate = doc.updated_at;
    if (doc.source_type) entry.hasSource = true;
  }

  const folders: FolderEntry[] = [...subfolderMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, info]) => ({
      name,
      fullPath: prefix + name,
      totalDocs: info.totalDocs,
      directDocs: info.directDocs,
      subfolderCount: info.subfolders.size,
      latestUpdate: info.latestUpdate,
      hasSource: info.hasSource,
    }));

  return { folders, directDocs, unfiledDocs };
}

export function FolderTileGrid({ documents, currentPath, onNavigate, onSelectUnfiled }: FolderTileGridProps) {
  const { theme } = useTheme();
  const windowWidth = useWindowWidth();
  const columns = windowWidth >= SMALL_BREAKPOINT ? 3 : 2;

  const { folders, unfiledDocs } = useMemo(
    () => computeLevel(documents, currentPath),
    [documents, currentPath],
  );

  if (folders.length === 0 && unfiledDocs.length === 0) return null;
  // If only unfiled docs and no folders, skip directory view
  if (folders.length === 0 && !currentPath) return null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: theme.spacing.md,
      }}
    >
      {folders.map((f) => (
        <FolderTile
          key={f.fullPath}
          folder={f}
          onClick={() => onNavigate(f.fullPath)}
        />
      ))}
      {!currentPath && unfiledDocs.length > 0 && (
        <UnfiledTile count={unfiledDocs.length} onClick={onSelectUnfiled} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Folder tile
// ---------------------------------------------------------------------------

function FolderTile({ folder, onClick }: { folder: FolderEntry; onClick: () => void }) {
  const { theme } = useTheme();
  const [hovered, setHovered] = useState(false);

  const borderColor = hovered
    ? theme.glow.animated ? theme.glow.borderMedium : theme.color.border
    : theme.glow.borderSubtle;

  const shadow = hovered
    ? theme.glow.animated ? theme.glow.shadowMd : theme.shadow.md
    : "none";

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: theme.radius.lg,
        border: `1px solid ${borderColor}`,
        background: theme.color.surfaceContainer,
        boxShadow: shadow,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        padding: theme.spacing.md,
        gap: theme.spacing.sm,
        transition: "border-color 0.2s, box-shadow 0.25s, background 0.15s",
      }}
    >
      {/* Icon + name */}
      <div style={{ display: "flex", alignItems: "center", gap: theme.spacing.sm }}>
        <Icon name="folder" size={22} style={{ color: theme.color.primary }} />
        <span
          style={{
            flex: 1, minWidth: 0,
            fontSize: theme.font.size.sm, fontWeight: 700,
            fontFamily: theme.font.body, color: theme.color.text,
            letterSpacing: theme.font.letterSpacing.tight,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}
        >
          {folder.name}
        </span>
      </div>

      {/* Meta row */}
      <div style={{ display: "flex", alignItems: "center", gap: theme.spacing.sm, flexWrap: "wrap" }}>
        <span style={{ fontSize: theme.font.size.xxs, color: theme.color.textMuted }}>
          {folder.totalDocs} doc{folder.totalDocs !== 1 ? "s" : ""}
        </span>
        {folder.subfolderCount > 0 && (
          <span style={{ fontSize: theme.font.size.xxs, color: theme.color.textFaint }}>
            {folder.subfolderCount} subfolder{folder.subfolderCount !== 1 ? "s" : ""}
          </span>
        )}
        {folder.hasSource && (
          <Icon name="link" size={12} style={{ color: theme.color.textFaint }} title="Contains imported documents" />
        )}
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: theme.font.size.xxs, color: theme.color.textFaint }}>
          {formatDate(folder.latestUpdate)}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Unfiled tile
// ---------------------------------------------------------------------------

function UnfiledTile({ count, onClick }: { count: number; onClick: () => void }) {
  const { theme } = useTheme();
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: theme.radius.lg,
        border: `1px solid ${hovered ? theme.color.border : theme.glow.borderSubtle}`,
        background: theme.color.surfaceContainer,
        boxShadow: hovered ? theme.shadow.md : "none",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        padding: theme.spacing.md,
        gap: theme.spacing.sm,
        transition: "border-color 0.2s, box-shadow 0.25s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: theme.spacing.sm }}>
        <Icon name="draft" size={22} style={{ color: theme.color.textFaint }} />
        <span style={{ fontSize: theme.font.size.sm, fontWeight: 700, fontFamily: theme.font.body, color: theme.color.textMuted }}>
          Unfiled
        </span>
      </div>
      <span style={{ fontSize: theme.font.size.xxs, color: theme.color.textMuted }}>
        {count} doc{count !== 1 ? "s" : ""}
      </span>
    </div>
  );
}
