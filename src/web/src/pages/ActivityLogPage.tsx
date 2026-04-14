import { useCallback, useMemo, useState } from "react";
import {
  Badge,
  EmptyState,
  Icon,
  ListPageLayout,
  PageHeader,
  Pagination,
  Select,
} from "../components";
import { semantic as t } from "@4lt7ab/ui/core";
import { actionBadgeColor } from "../utils";
import { useToastContext } from "../components/ToastContext";
import { DocumentReaderModal } from "../components/organisms/DocumentReaderModal";
import { useActivityLog } from "../hooks/useActivityLog";
import { fetchTask, ApiError } from "../api";
import type { ActivityLog } from "../types";
import { relativeTime, formatDate } from "../utils";

// ---------------------------------------------------------------------------
// Action badge mapping
// ---------------------------------------------------------------------------

function ActionBadge({ action }: { action: string }) {
  return <Badge color={actionBadgeColor(action)}>{action}</Badge>;
}

// ---------------------------------------------------------------------------
// Summary renderer
// ---------------------------------------------------------------------------

function SummaryCell({ summary }: { summary: string }) {
  const parsed = useMemo(() => {
    try {
      return JSON.parse(summary) as Record<string, unknown>;
    } catch {
      return null;
    }
  }, [summary]);

  if (!parsed || Object.keys(parsed).length === 0) {
    return <span style={{ color: t.colorTextSecondary }}>--</span>;
  }

  const parts: string[] = [];

  if (typeof parsed.title === "string") {
    parts.push(parsed.title);
  }
  if (Array.isArray(parsed.fields) && parsed.fields.length > 0) {
    parts.push((parsed.fields as string[]).join(", "));
  }
  if (typeof parsed.project_id === "string") {
    parts.push(`project ${(parsed.project_id as string).slice(-6)}`);
  }

  return (
    <span
      style={{
        fontFamily: t.fontMono,
        fontSize: t.fontSizeXs,
        color: t.colorTextMuted,
      }}
    >
      {parts.join(" \u00b7 ") || summary}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Table row
// ---------------------------------------------------------------------------

interface LogRowProps {
  log: ActivityLog;
  onClick: (() => void) | null;
}

function LogRow({ log, onClick }: LogRowProps) {
  const [hovered, setHovered] = useState(false);
  const isClickable = onClick !== null;

  return (
    <tr
      onClick={isClickable ? onClick : undefined}
      onMouseEnter={isClickable ? () => setHovered(true) : undefined}
      onMouseLeave={isClickable ? () => setHovered(false) : undefined}
      style={{
        cursor: isClickable ? "pointer" : "default",
        background: hovered ? t.colorSurfaceRaised : undefined,
        transition: "background 120ms ease",
      }}
    >
      <td style={cellStyle()}>
        <ActionBadge action={log.action} />
      </td>
      <td style={cellStyle()}>
        <Badge variant="default">{log.entity_type}</Badge>
      </td>
      <td
        style={{
          ...cellStyle(),
          fontFamily: t.fontMono,
          fontSize: t.fontSizeXs,
          color: t.colorTextSecondary,
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: t.spaceXs }}>
          {log.entity_id ? log.entity_id.slice(-8) : "--"}
          {isClickable && (
            <Icon
              name="open_in_new"
              size={14}
              style={{ color: t.colorTextSecondary, opacity: hovered ? 1 : 0.5 }}
            />
          )}
        </span>
      </td>
      <td style={cellStyle()}>
        <SummaryCell summary={log.summary} />
      </td>
      <td
        style={{
          ...cellStyle(),
          fontFamily: t.fontMono,
          fontSize: t.fontSizeXs,
          color: t.colorTextSecondary,
          whiteSpace: "nowrap",
        }}
        title={formatDate(log.created_at)}
      >
        {relativeTime(log.created_at)}
      </td>
    </tr>
  );
}

function cellStyle(): React.CSSProperties {
  return {
    padding: `${t.spaceSm} ${t.spaceMd}`,
    borderBottom: `1px solid ${t.colorBorder}`,
    verticalAlign: "middle",
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface ActivityLogPageProps {
  onNavigate: (path: string) => void;
}

export function ActivityLogPage({ onNavigate }: ActivityLogPageProps) {
  const { showToast } = useToastContext();
  const [entityType, setEntityType] = useState<string | undefined>(undefined);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  const filter = useMemo(
    () => (entityType ? { entity_type: entityType } : undefined),
    [entityType],
  );

  const { logs, total, totalPages, page, setPage, loading } = useActivityLog(filter);

  const handleRowClick = useCallback(
    (log: ActivityLog) => {
      if (!log.entity_id) return;

      if (log.action === "deleted") {
        showToast("This entity has been deleted", "warning");
        return;
      }

      switch (log.entity_type) {
        case "project":
          onNavigate(`/projects/${log.entity_id}`);
          break;
        case "task":
          fetchTask(log.entity_id)
            .then((task) => {
              onNavigate(`/projects/${task.project_id}`);
            })
            .catch((err) => {
              if (err instanceof ApiError && err.status === 404) {
                showToast("Task not found — it may have been deleted", "warning");
              } else {
                showToast("Failed to load task details", "error");
              }
            });
          break;
        case "document":
          setSelectedDocumentId(log.entity_id);
          break;
        default:
          break;
      }
    },
    [onNavigate, showToast],
  );

  const getRowClickHandler = useCallback(
    (log: ActivityLog): (() => void) | null => {
      if (!log.entity_id) return null;
      return () => handleRowClick(log);
    },
    [handleRowClick],
  );

  return (
    <ListPageLayout>
      <PageHeader
        title="Activity Log"
        subtitle={`${total} events recorded`}
        trailing={
          <Select
            value={entityType ?? ""}
            onChange={(e) => {
              setEntityType(e.target.value || undefined);
              setPage(1);
            }}
            options={[
              { value: "", label: "All types" },
              { value: "project", label: "Projects" },
              { value: "task", label: "Tasks" },
              { value: "document", label: "Documents" },
            ]}
            style={{ minWidth: 140 }}
          />
        }
        style={{ marginBottom: t.spaceXl }}
      />

      {loading ? (
        <div style={{ textAlign: "center", padding: t.spaceXl, color: t.colorTextMuted }}>
          Loading...
        </div>
      ) : logs.length === 0 ? (
        <EmptyState icon="history" message="No activity recorded yet." variant="card" />
      ) : (
        <div
          style={{
            overflowX: "auto",
            borderRadius: t.radiusLg,
            border: `1px solid ${t.colorBorder}`,
            background: t.colorSurface,
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: t.fontSizeSm,
              color: t.colorText,
            }}
          >
            <thead>
              <tr>
                {["Action", "Type", "Entity", "Details", "When"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: `${t.spaceSm} ${t.spaceMd}`,
                      textAlign: "left",
                      fontWeight: 600,
                      fontSize: t.fontSizeXs,
                      color: t.colorTextMuted,
                      textTransform: "uppercase",
                      letterSpacing: t.letterSpacingWide,
                      borderBottom: `2px solid ${t.colorBorder}`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <LogRow key={log.id} log={log} onClick={getRowClickHandler(log)} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
        />
      )}

      {selectedDocumentId && (
        <DocumentReaderModal
          documentId={selectedDocumentId}
          onClose={() => setSelectedDocumentId(null)}
        />
      )}
    </ListPageLayout>
  );
}
