import { useMemo, useState } from "react";
import {
  Badge,
  EmptyState,
  ListPageLayout,
  PageHeader,
  Pagination,
  Select,
  useTheme,
} from "../components";
import { useJobs } from "../hooks/useJobs";
import type { Agent, Job } from "../types";
import { relativeTime, formatDate } from "../utils";

// ---------------------------------------------------------------------------
// Status badge mapping
// ---------------------------------------------------------------------------

const STATUS_VARIANTS: Record<string, "todo" | "running" | "complete" | "failed" | "default"> = {
  todo: "todo",
  running: "running",
  done: "complete",
  failed: "failed",
  cancelled: "default",
};

function StatusBadge({ status }: { status: string }) {
  return <Badge variant={STATUS_VARIANTS[status] ?? "default"}>{status}</Badge>;
}

// ---------------------------------------------------------------------------
// Table row
// ---------------------------------------------------------------------------

function JobRow({ job, agent }: { job: Job; agent: Agent | undefined }) {
  const { theme } = useTheme();

  return (
    <tr>
      <td style={cellStyle(theme)}>
        <StatusBadge status={job.status} />
      </td>
      <td
        style={{
          ...cellStyle(theme),
          fontWeight: 500,
          fontSize: theme.font.size.sm,
        }}
      >
        {agent?.name ?? (
          <span style={{ color: theme.color.textFaint, fontFamily: theme.font.mono, fontSize: theme.font.size.xxs }}>
            {job.agent_id.slice(-8)}
          </span>
        )}
      </td>
      <td
        style={{
          ...cellStyle(theme),
          maxWidth: 300,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontFamily: theme.font.mono,
          fontSize: theme.font.size.xxs,
          color: theme.color.textMuted,
        }}
        title={job.input ?? undefined}
      >
        {job.input ?? <span style={{ color: theme.color.textFaint }}>--</span>}
      </td>
      <td
        style={{
          ...cellStyle(theme),
          maxWidth: 300,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontFamily: theme.font.mono,
          fontSize: theme.font.size.xxs,
          color: theme.color.textMuted,
        }}
        title={job.output ?? undefined}
      >
        {job.output ?? <span style={{ color: theme.color.textFaint }}>--</span>}
      </td>
      <td
        style={{
          ...cellStyle(theme),
          fontFamily: theme.font.mono,
          fontSize: theme.font.size.xxs,
          color: theme.color.textFaint,
          whiteSpace: "nowrap",
        }}
        title={formatDate(job.created_at)}
      >
        {relativeTime(job.created_at)}
      </td>
    </tr>
  );
}

function cellStyle(theme: ReturnType<typeof useTheme>["theme"]): React.CSSProperties {
  return {
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    borderBottom: `1px solid ${theme.color.border}`,
    verticalAlign: "middle",
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function JobsPage() {
  const { theme } = useTheme();
  const [status, setStatus] = useState<string | undefined>(undefined);

  const filter = useMemo(
    () => (status ? { status } : undefined),
    [status],
  );

  const { jobs, agents, total, totalPages, page, setPage, loading } = useJobs(filter);

  return (
    <ListPageLayout>
      <PageHeader
        title="Jobs"
        subtitle={`${total} job${total !== 1 ? "s" : ""} tracked`}
        trailing={
          <Select
            value={status ?? ""}
            onChange={(e) => {
              setStatus(e.target.value || undefined);
              setPage(1);
            }}
            options={[
              { value: "", label: "All statuses" },
              { value: "todo", label: "Todo" },
              { value: "running", label: "Running" },
              { value: "done", label: "Done" },
              { value: "failed", label: "Failed" },
              { value: "cancelled", label: "Cancelled" },
            ]}
            style={{ minWidth: 140 }}
          />
        }
        style={{ marginBottom: theme.spacing.xl }}
      />

      {loading ? (
        <div style={{ textAlign: "center", padding: theme.spacing.xl, color: theme.color.textMuted }}>
          Loading...
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState icon="work" message="No jobs yet." variant="card" />
      ) : (
        <div
          style={{
            overflowX: "auto",
            borderRadius: theme.radius.lg,
            border: `1px solid ${theme.color.border}`,
            background: theme.color.surface,
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: theme.font.size.sm,
              color: theme.color.text,
            }}
          >
            <thead>
              <tr>
                {["Status", "Agent", "Input", "Output", "Created"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                      textAlign: "left",
                      fontWeight: 600,
                      fontSize: theme.font.size.xxs,
                      color: theme.color.textMuted,
                      textTransform: "uppercase",
                      letterSpacing: theme.font.letterSpacing.wide,
                      borderBottom: `2px solid ${theme.color.border}`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <JobRow key={job.id} job={job} agent={agents.get(job.agent_id)} />
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
    </ListPageLayout>
  );
}
