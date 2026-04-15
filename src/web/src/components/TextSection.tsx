/**
 * TextSection — click-to-edit markdown block.
 *
 * Three states: editing (textarea + save/cancel), content (markdown preview,
 * click to edit), empty (italic placeholder, click to add).
 *
 * Shared across TaskDetailModal instances in ProjectDetailPage and TasksPage
 * for summary, context, and acceptance_criteria fields.
 */

import { semantic as t } from "@4lt7ab/ui/core";
import { Button, Textarea } from "@4lt7ab/ui/ui";
import { Markdown } from "@4lt7ab/ui/content";

export interface TextSectionProps {
  /** Current content value (null/undefined = empty state). */
  content: string | null | undefined;
  /** Whether the section is in edit mode. */
  editing: boolean;
  /** Current edit buffer value. */
  editValue: string;
  /** Called when the user clicks to start editing. */
  onStartEdit: () => void;
  /** Called as the user types in the textarea. */
  onEditChange: (value: string) => void;
  /** Called when the user clicks Save. */
  onSave: () => void;
  /** Called when the user clicks Cancel or presses Escape. */
  onCancel: () => void;
  /** Label shown in the placeholder and as the textarea aria-label. */
  fieldLabel: string;
  /** Number of textarea rows (default 4). */
  rows?: number;
  /** Custom placeholder text (defaults to "{fieldLabel}..."). */
  placeholder?: string;
}

export function TextSection({
  content,
  editing,
  editValue,
  onStartEdit,
  onEditChange,
  onSave,
  onCancel,
  fieldLabel,
  rows = 4,
  placeholder,
}: TextSectionProps) {
  return (
    <div>
      {editing ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: t.spaceSm,
          }}
        >
          <Textarea
            value={editValue}
            onChange={(e) => onEditChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onCancel();
            }}
            autoFocus
            rows={rows}
            placeholder={placeholder ?? `${fieldLabel}...`}
            aria-label={fieldLabel}
            style={{ width: "100%", boxSizing: "border-box" }}
          />
          <div
            style={{
              display: "flex",
              gap: t.spaceSm,
              justifyContent: "flex-end",
            }}
          >
            <Button size="sm" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button size="sm" onClick={onSave}>
              Save
            </Button>
          </div>
        </div>
      ) : content ? (
        <div
          onClick={onStartEdit}
          style={{ cursor: "pointer", minWidth: 0 }}
          title="Click to edit"
        >
          <Markdown style={{ fontSize: t.fontSizeSm }}>{content}</Markdown>
        </div>
      ) : (
        <p
          onClick={onStartEdit}
          style={{
            margin: 0,
            fontSize: t.fontSizeSm,
            color: `color-mix(in srgb, ${t.colorTextMuted} 50%, transparent)`,
            fontStyle: "italic",
            cursor: "pointer",
          }}
        >
          No {fieldLabel.toLowerCase()}. Click to add.
        </p>
      )}
    </div>
  );
}
