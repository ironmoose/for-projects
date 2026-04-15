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
  useToast,
} from "@4lt7ab/ui/ui";
import { Container, Prose, Markdown } from "@4lt7ab/ui/content";

import { useAutomations } from "../hooks/useAutomations";
import { useAutomation } from "../hooks/useAutomation";
import { TAG_NAMES, TAG_CATEGORIES } from "../types";
import type { AutomationSummary } from "../types";
import { PillSelect } from "../components/PillSelect";
import { PageShell } from "../components/PageShell";
import { formatRelativeDate, formatShortDate, staggerStyle } from "../utils";

// ---------------------------------------------------------------------------
// Injected styles — hover effects, stagger animations
// ---------------------------------------------------------------------------

const AUTO_STYLES_ID = "automations-page-styles";
const AUTO_STYLES_CSS = `
  .auto-card {
    transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
  }
  .auto-card:hover {
    transform: translateY(-2px);
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
}: {
  automations: AutomationSummary[];
  onSelect: (id: string) => void;
  onDelete: (a: AutomationSummary) => void;
  onToggleFavorite: (a: AutomationSummary) => void;
}) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
      gap: t.spaceMd,
    }}>
      {automations.map((a, i) => (
        <div
          key={a.id}
          className="auto-card"
          role="button"
          tabIndex={0}
          onClick={() => onSelect(a.id)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(a.id); } }}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: t.spaceSm,
            padding: t.spaceMd,
            borderRadius: t.radiusMd,
            border: `1px solid ${t.colorBorder}`,
            background: t.colorSurface,
            cursor: "pointer",
            position: "relative",
            ...staggerStyle(i),
          }}
        >
          {/* Header: title + actions */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: t.spaceSm }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="auto-card-title" style={{
                fontSize: t.fontSizeMd,
                fontWeight: 600,
                color: t.colorText,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {a.title}
              </div>
              {a.summary && (
                <div style={{
                  fontSize: t.fontSizeXs,
                  color: t.colorTextSecondary,
                  marginTop: 2,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}>
                  {a.summary}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 2, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
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

          {/* Metadata badges */}
          <div style={{ display: "flex", gap: t.spaceXs, flexWrap: "wrap", alignItems: "center" }}>
            {a.agent && (
              <Badge size="sm" style={{ background: `color-mix(in srgb, ${t.colorInfo} 12%, transparent)`, color: t.colorInfo }}>
                <Icon name="smart_toy" size={11} />
                {a.agent}
              </Badge>
            )}
            {a.category && (
              <Badge size="sm">{a.category}</Badge>
            )}
            {a.has_prompt && (
              <Badge size="sm" style={{ background: `color-mix(in srgb, ${t.colorSuccess} 12%, transparent)`, color: t.colorSuccess }}>
                <Icon name="code" size={11} />
                prompt
              </Badge>
            )}
          </div>

          {/* Tags */}
          {a.tags.length > 0 && (
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {a.tags.map((tag) => (
                <TagChip key={tag} label={tag} size="sm" />
              ))}
            </div>
          )}

          {/* Footer */}
          <div style={{ fontSize: t.fontSizeXs, color: t.colorTextMuted, marginTop: "auto" }}>
            {formatRelativeDate(a.updated_at)}
          </div>
        </div>
      ))}
    </div>
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
}: {
  automations: AutomationSummary[];
  onSelect: (id: string) => void;
  onDelete: (a: AutomationSummary) => void;
  onToggleFavorite: (a: AutomationSummary) => void;
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
            {a.agent && <Badge size="sm"><Icon name="smart_toy" size={11} /> {a.agent}</Badge>}
            {a.category && <Badge size="sm">{a.category}</Badge>}
          </div>
          <div style={{ fontSize: t.fontSizeXs, color: t.colorTextMuted, flexShrink: 0, width: 60, textAlign: "right" }}>
            {formatRelativeDate(a.updated_at)}
          </div>
          <div style={{ display: "flex", gap: 2, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
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
      <ModalShell title="Loading..." onClose={onClose}>
        <Skeleton height={200} />
      </ModalShell>
    );
  }

  if (!automation) {
    return (
      <ModalShell title="Not found" onClose={onClose}>
        <p style={{ color: t.colorTextMuted }}>Automation not found.</p>
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
    <ModalShell title={automation.title} onClose={onClose} width={720}>
      {/* Metadata row */}
      <div style={{ display: "flex", gap: t.spaceSm, flexWrap: "wrap", alignItems: "center", marginBottom: t.spaceMd }}>
        {automation.agent && (
          <Badge size="sm" style={{ background: `color-mix(in srgb, ${t.colorInfo} 12%, transparent)`, color: t.colorInfo }}>
            <Icon name="smart_toy" size={12} />
            {automation.agent}
          </Badge>
        )}
        {automation.category && <Badge size="sm">{automation.category}</Badge>}
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
          margin: `0 0 ${t.spaceMd}`,
          fontSize: t.fontSizeSm,
          color: t.colorTextSecondary,
          lineHeight: 1.6,
        }}>
          {automation.summary}
        </p>
      )}

      {/* Prompt content */}
      {automation.prompt ? (
        <div style={{
          border: `1px solid ${t.colorBorder}`,
          borderRadius: t.radiusMd,
          padding: t.spaceMd,
          background: t.colorSurfaceRaised,
          maxHeight: 400,
          overflowY: "auto",
          marginBottom: t.spaceMd,
        }}>
          <Prose>
            <Markdown content={automation.prompt} />
          </Prose>
        </div>
      ) : (
        <div style={{
          padding: t.spaceXl,
          textAlign: "center",
          color: t.colorTextMuted,
          fontSize: t.fontSizeSm,
          marginBottom: t.spaceMd,
        }}>
          No prompt content yet.
        </div>
      )}

      {/* Action bar */}
      <div style={{ display: "flex", gap: t.spaceSm, justifyContent: "flex-end" }}>
        {automation.prompt && (
          <>
            <Button size="sm" variant="ghost" onClick={handleCopyPrompt} aria-label="Copy prompt text to clipboard">
              <Icon name="content_copy" size={15} />
              Copy Prompt
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCopyCli} aria-label="Copy CLI command to clipboard">
              <Icon name="terminal" size={15} />
              Copy CLI
            </Button>
          </>
        )}
        <Button size="sm" variant="ghost" onClick={onEdit}>
          <Icon name="edit" size={15} />
          Edit
        </Button>
      </div>
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
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel={saving ? "Saving..." : initial ? "Save" : "Create"}
      submitDisabled={!title.trim() || saving}
    >
      <Field label="Title">
        <Input value={title} onChange={setTitle} placeholder="e.g. Code review prompt" autoFocus />
      </Field>
      <Field label="Summary" description="Brief description for the list view">
        <Textarea value={summary} onChange={setSummary} placeholder="What does this automation do?" rows={2} />
      </Field>
      <Field label="Prompt" description="The full prompt content">
        <Textarea value={prompt} onChange={setPrompt} placeholder="Enter the prompt..." rows={10} />
      </Field>
      <Field label="Agent" description="Optional --agent flag value for CLI">
        <Input value={agent} onChange={setAgent} placeholder="e.g. code-reviewer" />
      </Field>
      <Field label="Category">
        <Input value={category} onChange={setCategory} placeholder="e.g. code-review, refactor, docs" />
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
          title={search || tag || favorite ? "No matches" : "No automations yet"}
          description={search || tag || favorite ? "Try adjusting your filters." : "Create your first automation to save a reusable prompt."}
          action={!search && !tag && !favorite ? { label: "Create Automation", onClick: () => setShowCreate(true) } : undefined}
        />
      ) : (
        <>
          {viewMode === "cards" ? (
            <AutomationCardGrid
              automations={automations}
              onSelect={setSelectedId}
              onDelete={setDeleteTarget}
              onToggleFavorite={handleToggleFavorite}
            />
          ) : (
            <AutomationListView
              automations={automations}
              onSelect={setSelectedId}
              onDelete={setDeleteTarget}
              onToggleFavorite={handleToggleFavorite}
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
