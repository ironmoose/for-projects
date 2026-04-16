/**
 * AutomationsPage — self-contained page component.
 *
 * UI dependencies: @4lt7ab/ui only. No internal atoms/molecules/organisms.
 * Data dependencies: hooks (useAutomations, useAutomation) and api layer.
 *
 * This is a "Page component" — it owns its entire UI tree. Sub-components are
 * defined inline in this file, not extracted to the atomic hierarchy.
 */

import { useMemo, useState, useCallback } from "react";
import { semantic as t, useInjectStyles } from "@4lt7ab/ui/core";
import {
  Button,
  IconButton,
  Icon,
  Badge,
  TagChip,
  EmptyState,
  Pagination,
  ConfirmDialog,
  FormModal,
  ModalShell,
  Field,
  Input,
  Textarea,
  SearchInput,
  Skeleton,
  SegmentedControl,
  SectionLabel,
  ChipPicker,
  Grid,
  Surface,
  useToast,
} from "@4lt7ab/ui/ui";
import { Container, Prose, Markdown } from "@4lt7ab/ui/content";

import { useAutomations } from "../hooks/useAutomations";
import { useAutomation } from "../hooks/useAutomation";
import { fetchAutomation } from "../api";
import { TAG_NAMES, TAG_CATEGORIES } from "../types";
import type { AutomationSummary } from "../types";
import { PillSelect } from "../components/PillSelect";
import { PageShell } from "../components/PageShell";
import { SolidModalBody } from "../components/SolidModalBody";
import { formatRelativeDate, formatShortDate, staggerStyle } from "../utils";

// ---------------------------------------------------------------------------
// Injected styles — hover effects, stagger animations
// ---------------------------------------------------------------------------

const AUTO_STYLES_ID = "automations-page-styles";
const AUTO_STYLES_CSS = `
  .auto-card {
    transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  }
  .auto-card:hover {
    transform: translateY(-3px);
    border-color: ${t.colorBorderFocused};
    box-shadow: ${t.shadowMd};
  }
  .auto-card:hover .auto-card-title {
    color: ${t.colorActionPrimary};
  }
  .auto-list-row {
    transition: background 0.1s ease;
  }
  .auto-list-row:hover {
    background: ${t.colorSurfaceRaised};
  }
  @media (prefers-reduced-motion: reduce) {
    .auto-card, .auto-list-row { transition: none; }
  }
`;

// ---------------------------------------------------------------------------
// Tag chip items
// ---------------------------------------------------------------------------

const TAG_CHIP_ITEMS = Object.entries(TAG_CATEGORIES).flatMap(([category, tags]) =>
  tags.map((tag) => ({ value: tag, label: tag, group: category })),
);

// ---------------------------------------------------------------------------
// Clipboard helpers
// ---------------------------------------------------------------------------

function buildCliCommand(prompt: string, agent: string | null): string {
  const escaped = prompt.replace(/"/g, '\\"');
  let cmd = `claude -p "${escaped}"`;
  if (agent) cmd += ` --agent "${agent}"`;
  return cmd;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

function HeroSection({
  total,
  search,
  onSearchChange,
  onCreateClick,
}: {
  total: number;
  search: string;
  onSearchChange: (v: string) => void;
  onCreateClick: () => void;
}) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: t.spaceMd,
      padding: `${t.space2xl} 0 ${t.spaceLg}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: t.spaceSm }}>
        <Icon name="smart_toy" size={28} style={{ color: t.colorActionPrimary }} />
        <h1 style={{
          margin: 0,
          fontSize: t.fontSize2xl,
          fontWeight: 700,
          fontFamily: t.fontSerif,
          color: t.colorText,
          letterSpacing: t.letterSpacingTight,
        }}>
          Automations
        </h1>
      </div>
      <p style={{
        margin: 0,
        fontSize: t.fontSizeSm,
        color: t.colorTextMuted,
        textAlign: "center",
      }}>
        {total > 0
          ? `${total} automation${total !== 1 ? "s" : ""} — saved prompts ready to run.`
          : "No automations yet. Save your first prompt."}
      </p>
      <div style={{
        width: "100%",
        maxWidth: 520,
        display: "flex",
        gap: t.spaceSm,
        alignItems: "center",
      }}>
        <div style={{ flex: 1 }}>
          <SearchInput
            value={search}
            onSearch={onSearchChange}
            placeholder="Search automations..."
            debounceMs={200}
          />
        </div>
        <Button size="sm" onClick={onCreateClick}>
          <Icon name="add" size={15} />
          New
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter pills
// ---------------------------------------------------------------------------

function FilterPills({
  tag,
  onTagChange,
  favorite,
  onFavoriteChange,
  activeCount,
  onClearAll,
  viewMode,
  onViewModeChange,
}: {
  tag: string;
  onTagChange: (v: string) => void;
  favorite: boolean;
  onFavoriteChange: (v: boolean) => void;
  activeCount: number;
  onClearAll: () => void;
  viewMode: "table" | "cards";
  onViewModeChange: (v: "table" | "cards") => void;
}) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: t.spaceSm,
      flexWrap: "wrap",
    }}>
      <SegmentedControl
        size="sm"
        segments={[
          { value: "cards", label: "", icon: "grid_view" },
          { value: "table", label: "", icon: "view_list" },
        ]}
        value={viewMode}
        onChange={(v) => onViewModeChange(v as "table" | "cards")}
      />

      <div style={{
        width: 1,
        height: 20,
        background: `color-mix(in srgb, ${t.colorBorder} 50%, transparent)`,
        flexShrink: 0,
      }} />

      <FilterChip
        label="Favorites"
        icon="star"
        active={favorite}
        onClick={() => onFavoriteChange(!favorite)}
      />

      <PillSelect
        value={tag}
        options={[{ value: "", label: "Tag" }, ...TAG_NAMES.map((n) => ({ value: n, label: n }))]}
        onChange={onTagChange}
        ariaLabel="Filter by tag"
      />

      {activeCount > 0 && (
        <button
          onClick={onClearAll}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: `6px ${t.spaceMd}`,
            borderRadius: t.radiusFull,
            border: "none",
            background: "transparent",
            color: t.colorTextMuted,
            fontSize: t.fontSizeSm,
            minHeight: 32,
            fontFamily: t.fontSans,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <Icon name="close" size={12} />
          Clear
        </button>
      )}
    </div>
  );
}

function FilterChip({ label, icon, active, onClick }: { label: string; icon: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: `6px ${t.spaceMd}`,
        borderRadius: t.radiusFull,
        border: `1px solid ${active ? t.colorActionPrimary : `color-mix(in srgb, ${t.colorBorder} 60%, transparent)`}`,
        background: active ? `color-mix(in srgb, ${t.colorActionPrimary} 8%, transparent)` : "transparent",
        color: active ? t.colorActionPrimary : t.colorTextMuted,
        fontSize: t.fontSizeSm,
        fontFamily: t.fontSans,
        fontWeight: 600,
        cursor: "pointer",
        minHeight: 32,
      }}
    >
      <Icon name={icon} size={15} />
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Card grid
// ---------------------------------------------------------------------------

function AutomationCardGrid({
  automations,
  onSelect,
  onDelete,
  onToggleFavorite,
  onCopyPrompt,
  onCopyCli,
}: {
  automations: AutomationSummary[];
  onSelect: (id: string) => void;
  onDelete: (a: AutomationSummary) => void;
  onToggleFavorite: (a: AutomationSummary) => void;
  onCopyPrompt: (id: string) => void;
  onCopyCli: (id: string) => void;
}) {
  return (
    <Grid minColumnWidth={320} gap="md">
      {automations.map((a, i) => (
        <div
          key={a.id}
          role="button"
          tabIndex={0}
          onClick={() => onSelect(a.id)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(a.id); } }}
          style={{
            cursor: "pointer",
            borderRadius: t.radiusLg,
            ...staggerStyle(i, { delayMs: 40 }),
          }}
        >
        <Surface
          padding="lg"
          border
          shadow="sm"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: t.spaceMd }}>
          {/* Header: title + favorite indicator */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: t.spaceSm }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: t.spaceXs }}>
                <h3 className="auto-card-title" style={{
                  margin: 0,
                  fontSize: t.fontSizeLg,
                  fontWeight: 700,
                  fontFamily: t.fontSans,
                  color: t.colorText,
                  transition: "color 0.15s",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {a.title}
                </h3>
                {a.is_favorite && (
                  <Icon name="star" size={14} style={{ color: t.colorWarning, flexShrink: 0 }} />
                )}
              </div>
              {a.summary && (
                <p style={{
                  margin: `${t.spaceXs} 0 0`,
                  fontSize: t.fontSizeXs,
                  color: t.colorTextMuted,
                  lineHeight: t.lineHeightRelaxed,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}>
                  {a.summary}
                </p>
              )}
            </div>
          </div>

          {/* Metadata badges */}
          <div style={{ display: "flex", gap: t.spaceXs, flexWrap: "wrap", alignItems: "center" }}>
            {a.agent && (
              <Badge variant="info" size="xs">
                <Icon name="smart_toy" size={11} />
                {a.agent}
              </Badge>
            )}
            {a.category && (
              <Badge size="xs">{a.category}</Badge>
            )}
            {a.has_prompt && (
              <Badge variant="success" size="xs">
                <Icon name="code" size={11} />
                prompt
              </Badge>
            )}
            {a.tags.map((tag) => (
              <TagChip key={tag} label={tag} size="sm" />
            ))}
          </div>

          {/* Footer: timestamp + actions */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "auto",
            fontSize: "0.65rem",
            fontFamily: t.fontMono,
            color: `color-mix(in srgb, ${t.colorTextMuted} 70%, transparent)`,
          }}>
            <span>{formatRelativeDate(a.updated_at)}</span>
            <div style={{ display: "flex", alignItems: "center", gap: t.spaceSm }}>
              {a.has_prompt && (
                <>
                  <IconButton
                    icon="content_copy"
                    size={14}
                    aria-label="Copy prompt text"
                    onClick={(e) => { e.stopPropagation(); onCopyPrompt(a.id); }}
                  />
                  <IconButton
                    icon="terminal"
                    size={14}
                    aria-label="Copy CLI command"
                    onClick={(e) => { e.stopPropagation(); onCopyCli(a.id); }}
                  />
                </>
              )}
              <IconButton
                icon={a.is_favorite ? "star" : "star_border"}
                size={14}
                aria-label={a.is_favorite ? "Remove from favorites" : "Add to favorites"}
                onClick={(e) => { e.stopPropagation(); onToggleFavorite(a); }}
              />
              <IconButton
                icon="delete"
                size={14}
                aria-label={`Delete ${a.title}`}
                onClick={(e) => { e.stopPropagation(); onDelete(a); }}
              />
            </div>
          </div>
          </div>
        </Surface>
        </div>
      ))}
    </Grid>
  );
}

// ---------------------------------------------------------------------------
// List view
// ---------------------------------------------------------------------------

function AutomationListView({
  automations,
  onSelect,
  onDelete,
  onToggleFavorite,
  onCopyPrompt,
  onCopyCli,
}: {
  automations: AutomationSummary[];
  onSelect: (id: string) => void;
  onDelete: (a: AutomationSummary) => void;
  onToggleFavorite: (a: AutomationSummary) => void;
  onCopyPrompt: (id: string) => void;
  onCopyCli: (id: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {automations.map((a, i) => (
        <div
          key={a.id}
          className="auto-list-row"
          role="button"
          tabIndex={0}
          onClick={() => onSelect(a.id)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(a.id); } }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: t.spaceMd,
            padding: `${t.spaceSm} ${t.spaceMd}`,
            borderBottom: `1px solid color-mix(in srgb, ${t.colorBorder} 40%, transparent)`,
            cursor: "pointer",
            ...staggerStyle(i),
          }}
        >
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ fontSize: t.fontSizeSm, fontWeight: 600, color: t.colorText, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {a.title}
            </div>
            {a.summary && (
              <div style={{ fontSize: t.fontSizeXs, color: t.colorTextSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {a.summary}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: t.spaceXs, alignItems: "center", flexShrink: 0 }}>
            {a.agent && <Badge variant="info" size="xs"><Icon name="smart_toy" size={11} /> {a.agent}</Badge>}
            {a.category && <Badge size="xs">{a.category}</Badge>}
          </div>
          <div style={{ fontSize: t.fontSizeXs, color: t.colorTextMuted, flexShrink: 0, width: 60, textAlign: "right" }}>
            {formatRelativeDate(a.updated_at)}
          </div>
          <div style={{ display: "flex", gap: 2, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
            {a.has_prompt && (
              <>
                <IconButton
                  icon="content_copy"
                  size="sm"
                  variant="ghost"
                  onClick={() => onCopyPrompt(a.id)}
                  aria-label="Copy prompt text"
                  style={{ color: t.colorTextMuted }}
                />
                <IconButton
                  icon="terminal"
                  size="sm"
                  variant="ghost"
                  onClick={() => onCopyCli(a.id)}
                  aria-label="Copy CLI command"
                  style={{ color: t.colorTextMuted }}
                />
              </>
            )}
            <IconButton
              icon={a.is_favorite ? "star" : "star_border"}
              size="sm"
              variant="ghost"
              onClick={() => onToggleFavorite(a)}
              aria-label={a.is_favorite ? "Remove from favorites" : "Add to favorites"}
              style={{ color: a.is_favorite ? t.colorWarning : t.colorTextMuted }}
            />
            <IconButton
              icon="delete"
              size="sm"
              variant="ghost"
              onClick={() => onDelete(a)}
              aria-label="Delete automation"
              style={{ color: t.colorTextMuted }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail modal — the reader + copy actions
// ---------------------------------------------------------------------------

function AutomationDetailModal({
  automationId,
  onClose,
  onEdit,
}: {
  automationId: string;
  onClose: () => void;
  onEdit: () => void;
}) {
  const { automation, loading } = useAutomation(automationId);
  const { showToast } = useToast();

  if (loading) {
    return (
      <ModalShell onClose={onClose} maxWidth={720}>
        <SolidModalBody>
          <div style={{ padding: t.spaceXl }}>
            <Container width="prose">
              <div style={{ display: "flex", flexDirection: "column", gap: t.spaceMd }}>
                <Skeleton height={36} width="70%" />
                <Skeleton height={18} width="50%" />
                <Skeleton height={1} />
                <Skeleton height={200} />
              </div>
            </Container>
          </div>
        </SolidModalBody>
      </ModalShell>
    );
  }

  if (!automation) {
    return (
      <ModalShell onClose={onClose} maxWidth={720}>
        <SolidModalBody>
          <div style={{ padding: t.spaceXl }}>
            <EmptyState icon="error" message="Automation not found." />
          </div>
        </SolidModalBody>
      </ModalShell>
    );
  }

  async function handleCopyPrompt() {
    if (!automation?.prompt) return;
    const ok = await copyToClipboard(automation.prompt);
    showToast(ok ? "Prompt copied" : "Failed to copy");
  }

  async function handleCopyCli() {
    if (!automation?.prompt) return;
    const cmd = buildCliCommand(automation.prompt, automation.agent);
    const ok = await copyToClipboard(cmd);
    showToast(ok ? "CLI command copied" : "Failed to copy");
  }

  return (
    <ModalShell onClose={onClose} maxWidth={720}>
      <SolidModalBody>
      <div style={{ padding: `${t.space2xl} ${t.spaceXl} ${t.spaceXl}` }}>
        <Container width="prose">
          {/* Title */}
          <h2 style={{
            margin: 0,
            fontSize: t.fontSize2xl,
            fontWeight: 700,
            fontFamily: t.fontSerif,
            color: t.colorText,
            letterSpacing: t.letterSpacingTight,
          }}>
            {automation.title}
          </h2>

          {/* Metadata row */}
          <div style={{ display: "flex", gap: t.spaceSm, flexWrap: "wrap", alignItems: "center", marginTop: t.spaceMd }}>
            {automation.agent && (
              <Badge variant="info" size="xs">
                <Icon name="smart_toy" size={12} />
                {automation.agent}
              </Badge>
            )}
            {automation.category && <Badge size="xs">{automation.category}</Badge>}
            {automation.tags.map((tag) => (
              <TagChip key={tag} label={tag} size="sm" />
            ))}
            <span style={{ fontSize: t.fontSizeXs, color: t.colorTextMuted }}>
              Updated {formatShortDate(automation.updated_at)}
            </span>
          </div>

          {/* Summary */}
          {automation.summary && (
            <p style={{
              margin: `${t.spaceMd} 0 0`,
              fontSize: t.fontSizeSm,
              color: t.colorTextSecondary,
              lineHeight: 1.6,
            }}>
              {automation.summary}
            </p>
          )}

          {/* Divider */}
          <hr style={{ border: "none", borderTop: `1px solid ${t.colorBorder}`, margin: `${t.spaceLg} 0` }} />

          {/* Prompt content */}
          {automation.prompt ? (
            <Prose>
              <Markdown>{automation.prompt ?? ""}</Markdown>
            </Prose>
          ) : (
            <p style={{
              textAlign: "center",
              color: t.colorTextMuted,
              fontSize: t.fontSizeSm,
              padding: `${t.spaceXl} 0`,
            }}>
              No prompt content yet.
            </p>
          )}

          {/* Action bar */}
          <div style={{ display: "flex", gap: t.spaceSm, justifyContent: "flex-end", marginTop: t.spaceLg, paddingTop: t.spaceMd, borderTop: `1px solid ${t.colorBorder}` }}>
            {automation.prompt && (
              <>
                <Button size="sm" variant="ghost" onClick={handleCopyPrompt} aria-label="Copy prompt text to clipboard">
                  Copy Prompt
                </Button>
                <Button size="sm" variant="ghost" onClick={handleCopyCli} aria-label="Copy CLI command to clipboard">
                  Copy CLI
                </Button>
              </>
            )}
            <Button size="sm" variant="ghost" onClick={onEdit}>
              Edit
            </Button>
          </div>
        </Container>
      </div>
      </SolidModalBody>
    </ModalShell>
  );
}

// ---------------------------------------------------------------------------
// Create/Edit form modal
// ---------------------------------------------------------------------------

function AutomationFormModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: { title: string; summary: string | null; prompt: string | null; agent: string | null; category: string | null; tags: string[]; is_favorite: boolean };
  onSave: (values: { title: string; summary?: string; prompt?: string; agent?: string; category?: string; tags?: string[]; is_favorite?: boolean }) => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [prompt, setPrompt] = useState(initial?.prompt ?? "");
  const [agent, setAgent] = useState(initial?.agent ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [isFavorite, setIsFavorite] = useState(initial?.is_favorite ?? false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    setSaving(true);
    try {
      await onSave({
        title,
        summary: summary || undefined,
        prompt: prompt || undefined,
        agent: agent || undefined,
        category: category || undefined,
        tags: tags.length > 0 ? tags : undefined,
        is_favorite: isFavorite,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormModal
      title={initial ? "Edit Automation" : "New Automation"}
      submitLabel={saving ? "Saving..." : initial ? "Save" : "Create"}
      onSubmit={handleSubmit}
      onCancel={onClose}
      maxWidth={600}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: t.spaceMd }}>
        <Field label="Title" required>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Code review prompt" autoFocus />
        </Field>

        <Field label="Summary">
          <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="What does this automation do?" rows={2} />
        </Field>

        <Field label="Prompt">
          <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Enter the prompt..." rows={10} />
        </Field>

        <Field label="Agent">
          <Input value={agent} onChange={(e) => setAgent(e.target.value)} placeholder="e.g. code-reviewer" />
        </Field>

        <Field label="Category">
          <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. code-review, refactor, docs" />
        </Field>

        <Field label="Tags">
          <ChipPicker
            items={TAG_CHIP_ITEMS}
            selected={tags}
            onChange={setTags}
          />
        </Field>

        <Field label="Favorite">
          <button
            type="button"
            onClick={() => setIsFavorite(!isFavorite)}
            aria-pressed={isFavorite}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: t.spaceXs,
              padding: `${t.spaceXs} ${t.spaceMd}`,
              borderRadius: t.radiusFull,
              border: `1px solid ${isFavorite ? t.colorWarning : t.colorBorder}`,
              background: isFavorite ? `color-mix(in srgb, ${t.colorWarning} 8%, transparent)` : "transparent",
              color: isFavorite ? t.colorWarning : t.colorTextMuted,
              cursor: "pointer",
              fontSize: t.fontSizeSm,
              fontFamily: t.fontSans,
              fontWeight: 600,
            }}
          >
          <Icon name={isFavorite ? "star" : "star_border"} size={15} />
          {isFavorite ? "Favorited" : "Not favorited"}
        </button>
      </Field>
      </div>
    </FormModal>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export function AutomationsPage() {
  useInjectStyles(AUTO_STYLES_ID, AUTO_STYLES_CSS);

  const [search, setSearch] = useState("");
  const [tag, setTag] = useState("");
  const [favorite, setFavorite] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "cards">("cards");

  const filter = useMemo(() => ({
    title: search || undefined,
    tag: tag || undefined,
    is_favorite: favorite || undefined,
  }), [search, tag, favorite]);

  const { automations, loading, total, totalPages, page, setPage, create, update, remove } = useAutomations(filter);

  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AutomationSummary | null>(null);
  const { showToast } = useToast();

  const activeFilterCount = (tag ? 1 : 0) + (favorite ? 1 : 0);

  const handleToggleFavorite = useCallback(async (a: AutomationSummary) => {
    try {
      await update(a.id, { is_favorite: !a.is_favorite });
    } catch {
      showToast("Failed to update favorite");
    }
  }, [update, showToast]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await remove([deleteTarget.id]);
      setDeleteTarget(null);
      if (selectedId === deleteTarget.id) setSelectedId(null);
    } catch {
      showToast("Failed to delete automation");
    }
  }, [deleteTarget, remove, selectedId, showToast]);

  const handleCopyPrompt = useCallback(async (id: string) => {
    try {
      const full = await fetchAutomation(id);
      if (!full.prompt) { showToast("No prompt content"); return; }
      const ok = await copyToClipboard(full.prompt);
      showToast(ok ? "Prompt copied" : "Failed to copy");
    } catch {
      showToast("Failed to fetch automation");
    }
  }, [showToast]);

  const handleCopyCli = useCallback(async (id: string) => {
    try {
      const full = await fetchAutomation(id);
      if (!full.prompt) { showToast("No prompt content"); return; }
      const cmd = buildCliCommand(full.prompt, full.agent);
      const ok = await copyToClipboard(cmd);
      showToast(ok ? "CLI command copied" : "Failed to copy");
    } catch {
      showToast("Failed to fetch automation");
    }
  }, [showToast]);

  return (
    <PageShell topPadding={false}>
      <HeroSection
        total={total}
        search={search}
        onSearchChange={setSearch}
        onCreateClick={() => setShowCreate(true)}
      />

      <FilterPills
        tag={tag}
        onTagChange={setTag}
        favorite={favorite}
        onFavoriteChange={setFavorite}
        activeCount={activeFilterCount}
        onClearAll={() => { setTag(""); setFavorite(false); }}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Content */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: t.spaceSm }}>
          {[...Array(4)].map((_, i) => <Skeleton key={i} height={60} />)}
        </div>
      ) : automations.length === 0 ? (
        <EmptyState
          icon="smart_toy"
          message={
            search || tag || favorite
              ? "Nothing matches those filters. Try broadening your search."
              : "No automations yet. Save your first prompt to get started."
          }
        />
      ) : (
        <>
          {viewMode === "cards" ? (
            <AutomationCardGrid
              automations={automations}
              onSelect={setSelectedId}
              onDelete={setDeleteTarget}
              onToggleFavorite={handleToggleFavorite}
              onCopyPrompt={handleCopyPrompt}
              onCopyCli={handleCopyCli}
            />
          ) : (
            <AutomationListView
              automations={automations}
              onSelect={setSelectedId}
              onDelete={setDeleteTarget}
              onToggleFavorite={handleToggleFavorite}
              onCopyPrompt={handleCopyPrompt}
              onCopyCli={handleCopyCli}
            />
          )}

          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", paddingTop: t.spaceMd }}>
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </>
      )}

      {/* Detail modal */}
      {selectedId && !editId && (
        <AutomationDetailModal
          automationId={selectedId}
          onClose={() => setSelectedId(null)}
          onEdit={() => setEditId(selectedId)}
        />
      )}

      {/* Create modal */}
      {showCreate && (
        <AutomationFormModal
          onSave={async (values) => {
            await create(values);
          }}
          onClose={() => setShowCreate(false)}
        />
      )}

      {/* Edit modal */}
      {editId && (
        <EditAutomationModal
          automationId={editId}
          onClose={() => { setEditId(null); }}
          onSaved={() => { setEditId(null); }}
        />
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete automation?"
          message={`"${deleteTarget.title}" will be permanently deleted.`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          variant="destructive"
        />
      )}
    </PageShell>
  );
}

// ---------------------------------------------------------------------------
// Edit modal wrapper — loads full automation then renders form
// ---------------------------------------------------------------------------

function EditAutomationModal({
  automationId,
  onClose,
  onSaved,
}: {
  automationId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { automation, loading, updateAutomation } = useAutomation(automationId);

  if (loading || !automation) {
    return (
      <ModalShell title="Loading..." onClose={onClose}>
        <Skeleton height={200} />
      </ModalShell>
    );
  }

  return (
    <AutomationFormModal
      initial={{
        title: automation.title,
        summary: automation.summary,
        prompt: automation.prompt,
        agent: automation.agent,
        category: automation.category,
        tags: automation.tags,
        is_favorite: automation.is_favorite,
      }}
      onSave={async (values) => {
        await updateAutomation(values);
        onSaved();
      }}
      onClose={onClose}
    />
  );
}
