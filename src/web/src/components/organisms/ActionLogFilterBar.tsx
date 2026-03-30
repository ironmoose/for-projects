import { Input, Select, Button, useTheme } from "..";
import type { ActionLogFilters } from "../../hooks/useActionLogSearch";

interface ActionLogFilterBarProps {
  filters: ActionLogFilters;
  onFilterChange: <K extends keyof ActionLogFilters>(key: K, value: ActionLogFilters[K]) => void;
  onClear: () => void;
}

const statusOptions = [
  { value: "", label: "All statuses" },
  { value: "running", label: "Running" },
  { value: "done", label: "Done" },
  { value: "failed", label: "Failed" },
];

const entityTypeOptions = [
  { value: "", label: "All entities" },
  { value: "project", label: "Project" },
  { value: "task", label: "Task" },
];

const actionKindOptions = [
  { value: "", label: "All kinds" },
  { value: "plan", label: "Plan" },
  { value: "goal", label: "Goal" },
  { value: "requirements", label: "Requirements" },
  { value: "design", label: "Design" },
];

export function ActionLogFilterBar({ filters, onFilterChange, onClear }: ActionLogFilterBarProps) {
  const { theme } = useTheme();

  const hasFilters =
    filters.status !== "" ||
    filters.entity_type !== "" ||
    filters.action_kind !== "" ||
    filters.search !== "" ||
    filters.started_after !== "" ||
    filters.started_before !== "";

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: theme.spacing.md,
        alignItems: "flex-end",
        marginBottom: theme.spacing.lg,
      }}
    >
      <div style={{ flex: "1 1 180px", minWidth: 0 }}>
        <Input
          placeholder="Search output..."
          value={filters.search}
          onChange={(e) => onFilterChange("search", e.target.value)}
        />
      </div>
      <Select
        value={filters.status}
        onChange={(e) => onFilterChange("status", e.target.value)}
        options={statusOptions}
      />
      <Select
        value={filters.entity_type}
        onChange={(e) => onFilterChange("entity_type", e.target.value)}
        options={entityTypeOptions}
      />
      <Select
        value={filters.action_kind}
        onChange={(e) => onFilterChange("action_kind", e.target.value)}
        options={actionKindOptions}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.xs }}>
        <label
          style={{
            fontSize: theme.font.size.xs,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: theme.color.textFaint,
            fontFamily: theme.font.body,
          }}
        >
          After
        </label>
        <input
          type="date"
          value={filters.started_after}
          onChange={(e) => onFilterChange("started_after", e.target.value)}
          style={{
            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
            border: `1px solid ${theme.color.borderSubtle}`,
            borderRadius: theme.radius.lg,
            fontFamily: theme.font.body,
            fontSize: theme.font.size.sm,
            background: theme.color.surfaceContainerHigh,
            color: theme.color.text,
          }}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.xs }}>
        <label
          style={{
            fontSize: theme.font.size.xs,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: theme.color.textFaint,
            fontFamily: theme.font.body,
          }}
        >
          Before
        </label>
        <input
          type="date"
          value={filters.started_before}
          onChange={(e) => onFilterChange("started_before", e.target.value)}
          style={{
            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
            border: `1px solid ${theme.color.borderSubtle}`,
            borderRadius: theme.radius.lg,
            fontFamily: theme.font.body,
            fontSize: theme.font.size.sm,
            background: theme.color.surfaceContainerHigh,
            color: theme.color.text,
          }}
        />
      </div>
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear
        </Button>
      )}
    </div>
  );
}
