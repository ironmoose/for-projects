import { useMemo } from "react";
import {
  Card,
  StatusDot,
  Badge,
  Skeleton,
  ListPageLayout,
  PageHeader,
  EmptyState,
  ChartCard,
  DailyActivityChart,
  StatusDonutChart,
  KindBreakdownChart,
  DurationSparkline,
  ActivitySection,
  useTheme,
} from "../components";
import { useActionLogStats } from "../hooks";
import { useActivityFeed } from "../hooks/useActivityFeed";

const statusMeta: Record<string, { themeKey: "success" | "warning" | "danger" }> = {
  running: { themeKey: "warning" },
  done: { themeKey: "success" },
  failed: { themeKey: "danger" },
};

export function ActionsDashboardPage() {
  const { theme } = useTheme();
  const { stats, loading } = useActionLogStats();
  const activity = useActivityFeed();

  // Derive by_status from summary
  const byStatus = useMemo(() => {
    if (!stats?.summary) return [];
    const s = stats.summary;
    return [
      { status: "running", count: s.running },
      { status: "done", count: s.done },
      { status: "failed", count: s.failed },
    ].filter((r) => r.count > 0);
  }, [stats]);

  // Derive by_kind from daily data
  const byKind = useMemo(() => {
    if (!stats?.daily) return [];
    const counts: Record<string, number> = {};
    for (const d of stats.daily) {
      counts[d.kind] = (counts[d.kind] ?? 0) + d.count;
    }
    return Object.entries(counts)
      .map(([kind, count]) => ({ kind, count }))
      .sort((a, b) => a.kind.localeCompare(b.kind));
  }, [stats]);

  const total = stats?.summary?.total ?? 0;
  const hasData = total > 0 || (stats?.daily ?? []).length > 0;

  return (
    <ListPageLayout>
      <PageHeader
        title="Actions Dashboard"
        subtitle="Overview of action log activity."
        style={{ marginBottom: theme.spacing.xl }}
      />

      {/* Charts */}
      {loading ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: theme.spacing.lg, marginBottom: theme.spacing.xl }}>
          <div style={{ flex: "1 1 400px" }}>
            <Skeleton width="100%" height={240} borderRadius={theme.radius.xl} />
          </div>
          <div style={{ flex: "0 1 280px" }}>
            <Skeleton width="100%" height={240} borderRadius={theme.radius.xl} />
          </div>
          <div style={{ flex: "1 1 340px" }}>
            <Skeleton width="100%" height={180} borderRadius={theme.radius.xl} />
          </div>
          <div style={{ flex: "1 1 340px" }}>
            <Skeleton width="100%" height={180} borderRadius={theme.radius.xl} />
          </div>
        </div>
      ) : hasData && stats ? (
        <div style={{ marginBottom: theme.spacing.xl }}>
          {/* Row 1 */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: theme.spacing.lg, marginBottom: theme.spacing.lg }}>
            <ChartCard title="Daily Activity" style={{ flex: "1 1 400px", minWidth: 0 }}>
              <DailyActivityChart data={stats.daily} width={560} height={180} />
            </ChartCard>
            <ChartCard title="Status Breakdown" style={{ flex: "0 1 280px", minWidth: 200 }}>
              <StatusDonutChart summary={stats.summary} width={220} height={180} />
            </ChartCard>
          </div>
          {/* Row 2 */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: theme.spacing.lg }}>
            <ChartCard title="By Kind" style={{ flex: "1 1 340px", minWidth: 0 }}>
              <KindBreakdownChart data={stats.daily} width={380} height={140} />
            </ChartCard>
            <ChartCard title="Avg Duration / Day" style={{ flex: "1 1 340px", minWidth: 0 }}>
              <DurationSparkline data={stats.daily} width={380} height={120} />
            </ChartCard>
          </div>
        </div>
      ) : (
        <EmptyState
          icon="bar_chart"
          message="No action log data yet. Run some actions to see charts."
          variant="card"
          style={{ marginBottom: theme.spacing.xl }}
        />
      )}

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
            {total}
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
              {byStatus.map(({ status, count }) => {
                const meta = statusMeta[status];
                const dotColor = meta ? theme.color[meta.themeKey] : theme.color.textMuted;
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
              {byStatus.length === 0 && (
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
              {byKind.map(({ kind, count }) => (
                <Card key={kind} style={{ flex: "1 1 140px", minWidth: 140 }}>
                  <div style={{ marginBottom: theme.spacing.xs }}>
                    <Badge variant="default">{kind}</Badge>
                  </div>
                  <div style={{ fontSize: theme.font.size.xl, fontWeight: 600, color: theme.color.text }}>
                    {count}
                  </div>
                </Card>
              ))}
              {byKind.length === 0 && (
                <Card style={{ flex: "1 1 140px", minWidth: 140 }}>
                  <span style={{ fontSize: theme.font.size.sm, color: theme.color.textMuted }}>No data</span>
                </Card>
              )}
            </>
          )}
        </div>
      </div>

      {/* Live Activity */}
      <div style={{ marginTop: theme.spacing.xl }}>
        <ActivitySection
          running={activity.running}
          recent={activity.recent}
          loading={activity.loading}
          timeframeMinutes={activity.timeframeMinutes}
          onTimeframeChange={activity.setTimeframeMinutes}
        />
      </div>
    </ListPageLayout>
  );
}
