import {
  Card,
  StatusDot,
  Badge,
  Skeleton,
  ListPageLayout,
  PageHeader,
  useTheme,
} from "../components";
import { useActionLogStats } from "../hooks";

const statusColors: Record<string, { color: string; themeKey: "success" | "warning" | "danger" }> = {
  running: { color: "", themeKey: "warning" },
  done: { color: "", themeKey: "success" },
  failed: { color: "", themeKey: "danger" },
};

export function ActionsDashboardPage() {
  const { theme } = useTheme();
  const { stats, loading } = useActionLogStats();

  return (
    <ListPageLayout>
      <PageHeader
        title="Actions Dashboard"
        subtitle="Overview of action log activity."
        style={{ marginBottom: theme.spacing.xl }}
      />

      {/* Total card */}
      {loading ? (
        <Card variant="elevated" style={{ marginBottom: theme.spacing.lg }}>
          <Skeleton width={120} height={20} />
          <div style={{ marginTop: theme.spacing.sm }}>
            <Skeleton width={60} height={32} />
          </div>
        </Card>
      ) : (
        <Card variant="elevated" style={{ marginBottom: theme.spacing.lg }}>
          <div style={{ fontSize: theme.font.size.sm, color: theme.color.textMuted }}>
            Total Entries
          </div>
          <div style={{ fontSize: theme.font.size.xxl, fontWeight: 600, color: theme.color.text, marginTop: theme.spacing.xs }}>
            {stats?.total ?? 0}
          </div>
        </Card>
      )}

      {/* By Status */}
      <div style={{ marginBottom: theme.spacing.md }}>
        <div style={{ fontSize: theme.font.size.sm, fontWeight: 600, color: theme.color.textMuted, marginBottom: theme.spacing.sm }}>
          By Status
        </div>
        <div style={{ display: "flex", gap: theme.spacing.md, flexWrap: "wrap" }}>
          {loading ? (
            <>
              {["running", "done", "failed"].map((s) => (
                <Card key={s} style={{ flex: "1 1 140px", minWidth: 140 }}>
                  <Skeleton width={80} height={16} />
                  <div style={{ marginTop: theme.spacing.sm }}>
                    <Skeleton width={40} height={24} />
                  </div>
                </Card>
              ))}
            </>
          ) : (
            <>
              {(stats?.by_status ?? []).map(({ status, count }) => {
                const info = statusColors[status];
                const dotColor = info ? theme.color[info.themeKey] : theme.color.textMuted;
                return (
                  <Card key={status} style={{ flex: "1 1 140px", minWidth: 140 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: theme.spacing.sm }}>
                      <StatusDot color={dotColor} size={10} />
                      <span style={{ fontSize: theme.font.size.sm, color: theme.color.text, textTransform: "capitalize" }}>
                        {status}
                      </span>
                    </div>
                    <div style={{ fontSize: theme.font.size.xl, fontWeight: 600, color: theme.color.text, marginTop: theme.spacing.xs }}>
                      {count}
                    </div>
                  </Card>
                );
              })}
              {(stats?.by_status ?? []).length === 0 && (
                <Card style={{ flex: "1 1 140px", minWidth: 140 }}>
                  <span style={{ fontSize: theme.font.size.sm, color: theme.color.textMuted }}>No data</span>
                </Card>
              )}
            </>
          )}
        </div>
      </div>

      {/* By Kind */}
      <div>
        <div style={{ fontSize: theme.font.size.sm, fontWeight: 600, color: theme.color.textMuted, marginBottom: theme.spacing.sm }}>
          By Kind
        </div>
        <div style={{ display: "flex", gap: theme.spacing.md, flexWrap: "wrap" }}>
          {loading ? (
            <>
              {["plan", "goal", "requirements", "design"].map((k) => (
                <Card key={k} style={{ flex: "1 1 140px", minWidth: 140 }}>
                  <Skeleton width={80} height={16} />
                  <div style={{ marginTop: theme.spacing.sm }}>
                    <Skeleton width={40} height={24} />
                  </div>
                </Card>
              ))}
            </>
          ) : (
            <>
              {(stats?.by_kind ?? []).map(({ kind, count }) => (
                <Card key={kind} style={{ flex: "1 1 140px", minWidth: 140 }}>
                  <div style={{ marginBottom: theme.spacing.xs }}>
                    <Badge variant="default">{kind}</Badge>
                  </div>
                  <div style={{ fontSize: theme.font.size.xl, fontWeight: 600, color: theme.color.text }}>
                    {count}
                  </div>
                </Card>
              ))}
              {(stats?.by_kind ?? []).length === 0 && (
                <Card style={{ flex: "1 1 140px", minWidth: 140 }}>
                  <span style={{ fontSize: theme.font.size.sm, color: theme.color.textMuted }}>No data</span>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </ListPageLayout>
  );
}
