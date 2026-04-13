import { useState, useMemo, useCallback } from "react";
import { semantic as t } from "@4lt7ab/ui/core";
import { Button } from "../atoms/Button";
import { Input, Field } from "@4lt7ab/ui/ui";
import { Icon } from "../atoms/Icon";
import { SectionLabel } from "../atoms/SectionLabel";
import { TagPicker } from "../molecules/TagPicker";
import { FolderInput } from "../molecules/FolderInput";
import { ModalShell } from "./ModalShell";
import { browseGitHubRepo, importDocumentBatch } from "../../api";
import type { GitHubTreeEntry } from "../../api";
import type { TagName } from "../../types";

interface GitHubBrowserOverlayProps {
  folders?: string[];
  onDone: () => void;
  onClose: () => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function GitHubBrowserOverlay({ folders = [], onDone, onClose }: GitHubBrowserOverlayProps) {
  // Step 1: repo input
  const [repoInput, setRepoInput] = useState("");
  // Step 2: browsing
  const [entries, setEntries] = useState<GitHubTreeEntry[]>([]);
  const [browsing, setBrowsing] = useState(false);
  const [browseError, setBrowseError] = useState<string | null>(null);
  const [repoLoaded, setRepoLoaded] = useState(false);
  // Filter & selection
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Import options
  const [folder, setFolder] = useState("");
  const [selectedTags, setSelectedTags] = useState<TagName[]>([]);
  // Import state
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const handleBrowse = useCallback(async () => {
    if (!repoInput.trim()) return;
    setBrowsing(true);
    setBrowseError(null);
    setEntries([]);
    setSelected(new Set());
    setRepoLoaded(false);

    try {
      const result = await browseGitHubRepo(repoInput.trim());
      setEntries(result.entries);
      setRepoLoaded(true);
    } catch (err) {
      setBrowseError(err instanceof Error ? err.message : "Failed to load repository");
    } finally {
      setBrowsing(false);
    }
  }, [repoInput]);

  const filtered = useMemo(() => {
    if (!filter.trim()) return entries;
    const q = filter.trim().toLowerCase();
    return entries.filter(e => e.path.toLowerCase().includes(q));
  }, [entries, filter]);

  const toggleSelect = useCallback((url: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(filtered.map(e => e.url)));
  }, [filtered]);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  const handleImport = useCallback(async () => {
    if (selected.size === 0) return;
    setImporting(true);
    setImportError(null);

    try {
      const inputs = [...selected].map(url => ({
        url,
        folder: folder.trim() || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
      }));
      await importDocumentBatch(inputs);
      onDone();
      onClose();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }, [selected, folder, selectedTags, onDone, onClose]);

  return (
    <ModalShell
      onClose={onClose}
      maxWidth={700}
      maxHeight="80vh"
      ariaLabelledBy="github-browser-title"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: t.spaceLg,
        padding: t.spaceXl,
        background: t.colorSurface,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 id="github-browser-title" style={{
          margin: 0,
          fontFamily: t.fontSerif,
          fontSize: t.fontSizeLg,
          fontWeight: 700,
          color: t.colorText,
        }}>
          Browse GitHub
        </h2>
        <Button size="sm" variant="ghost" onClick={onClose}>
          <Icon name="close" size={16} />
        </Button>
      </div>

      {/* Repo input */}
      <div style={{ display: "flex", gap: t.spaceSm, alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <Field label="Repository" htmlFor="repo-url">
            <Input
              id="repo-url"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              placeholder="owner/repo or https://github.com/owner/repo"
              onKeyDown={(e) => { if (e.key === "Enter") handleBrowse(); }}
            />
          </Field>
        </div>
        <Button
          size="sm"
          onClick={handleBrowse}
          loading={browsing}
          disabled={!repoInput.trim() || browsing}
          style={{ marginBottom: 1 }}
        >
          Browse
        </Button>
      </div>

      {browseError && (
        <p style={{ margin: 0, fontSize: t.fontSizeSm, color: t.colorActionDestructive }}>
          {browseError}
        </p>
      )}

      {/* File browser */}
      {repoLoaded && (
        <>
          {/* Search + selection controls */}
          <div style={{ display: "flex", gap: t.spaceSm, alignItems: "center" }}>
            <div style={{ flex: 1, position: "relative" }}>
              <Input
                id="file-filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder={`Filter ${entries.length} files...`}
              />
            </div>
            <span style={{ fontSize: t.fontSizeXs, color: t.colorTextMuted, whiteSpace: "nowrap" }}>
              {selected.size} selected
            </span>
            <Button size="sm" variant="ghost" onClick={selectAll} disabled={filtered.length === 0}>
              All
            </Button>
            <Button size="sm" variant="ghost" onClick={clearSelection} disabled={selected.size === 0}>
              None
            </Button>
          </div>

          {/* File list */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              border: `1px solid color-mix(in srgb, ${t.colorBorder} 50%, transparent)`,
              borderRadius: t.radiusMd,
              scrollbarWidth: "thin",
            }}
          >
            {filtered.length === 0 ? (
              <div style={{ padding: t.spaceLg, textAlign: "center", color: t.colorTextMuted, fontSize: t.fontSizeSm }}>
                {entries.length === 0 ? "No files found in this repository." : "No files match your filter."}
              </div>
            ) : (
              filtered.map((entry) => (
                <FileRow
                  key={entry.url}
                  entry={entry}
                  selected={selected.has(entry.url)}
                  onToggle={() => toggleSelect(entry.url)}
                />
              ))
            )}
          </div>

          {/* Import options */}
          <div style={{ display: "flex", gap: t.spaceLg, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 150 }}>
              <FolderInput value={folder} folders={folders} onChange={setFolder} />
            </div>
            <div style={{ flex: 1, minWidth: 150, display: "flex", flexDirection: "column", gap: t.spaceXs }}>
              <SectionLabel>Tags</SectionLabel>
              <TagPicker selected={selectedTags} onChange={setSelectedTags} />
            </div>
          </div>

          {importError && (
            <p style={{ margin: 0, fontSize: t.fontSizeSm, color: t.colorActionDestructive }}>
              {importError}
            </p>
          )}

          {/* Import button */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              onClick={handleImport}
              loading={importing}
              disabled={selected.size === 0 || importing}
            >
              Import {selected.size} file{selected.size !== 1 ? "s" : ""}
            </Button>
          </div>
        </>
      )}
    </ModalShell>
  );
}

// ---------------------------------------------------------------------------
// File row
// ---------------------------------------------------------------------------

function FileRow({ entry, selected, onToggle }: {
  entry: GitHubTreeEntry;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      onClick={onToggle}
      style={{
        display: "flex",
        alignItems: "center",
        gap: t.spaceSm,
        padding: `${t.spaceXs} ${t.spaceSm}`,
        borderBottom: `1px solid color-mix(in srgb, ${t.colorBorder} 50%, transparent)`,
        background: selected ? `color-mix(in srgb, ${t.colorActionPrimary} 7%, transparent)` : "transparent",
        cursor: "pointer",
        transition: "background 0.1s",
      }}
    >
      <Icon
        name={selected ? "check_box" : "check_box_outline_blank"}
        size={16}
        style={{ color: selected ? t.colorActionPrimary : t.colorTextSecondary, flexShrink: 0 }}
      />
      <span
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: t.fontSizeXs,
          fontFamily: t.fontMono,
          color: t.colorText,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={entry.path}
      >
        {entry.path}
      </span>
      <span style={{ fontSize: t.fontSizeXs, color: t.colorTextSecondary, flexShrink: 0 }}>
        {formatSize(entry.size)}
      </span>
    </div>
  );
}
