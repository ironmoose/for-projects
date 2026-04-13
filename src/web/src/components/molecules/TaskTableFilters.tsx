import { useCallback, useEffect, useRef, useState } from "react";
import { semantic as t } from "@4lt7ab/ui/core";
import { Input, Select } from "@4lt7ab/ui/ui";
import type { TaskFilter } from "../../hooks/useProjectTasks";
import {
  TASK_STATUSES,
  EFFORT_LEVELS,
  IMPACT_LEVELS,
  TASK_CATEGORIES,
} from "../../../../domain/entities";

function toFilterOptions(
  values: readonly string[],
  allLabel: string,
): { value: string; label: string }[] {
  return [
    { value: "", label: allLabel },
    ...values.map((v) => ({
      value: v,
      label: v.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()),
    })),
  ];
}

const statusOptions = (() => {
  const opts = toFilterOptions(TASK_STATUSES, "All statuses");
  opts.splice(1, 0, { value: "in_progress,todo", label: "Active" });
  return opts;
})();

const categoryOptions = toFilterOptions(TASK_CATEGORIES, "All categories");
const effortOptions = toFilterOptions(EFFORT_LEVELS, "All efforts");
const impactOptions = toFilterOptions(IMPACT_LEVELS, "All impacts");

interface TaskTableFiltersProps {
  filter: TaskFilter;
  onChange: (f: TaskFilter) => void;
  groupKeys?: string[];
}

export function TaskTableFilters({ filter, onChange, groupKeys }: TaskTableFiltersProps) {
  const [titleInput, setTitleInput] = useState(filter.title ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setTitleInput(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onChange({ ...filter, title: value || undefined });
      }, 300);
    },
    [filter, onChange],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: t.spaceSm, alignItems: "flex-end" }}>
      <div style={{ minWidth: 180, flex: "1 1 180px" }}>
        <Input
          placeholder="Search tasks..."
          value={titleInput}
          onChange={handleTitleChange}
        />
      </div>
      <Select
        value={filter.status ?? ""}
        onChange={(e) => onChange({ ...filter, status: e.target.value || undefined })}
        options={statusOptions}
        style={{ minWidth: 120 }}
      />
      <Select
        value={filter.category ?? ""}
        onChange={(e) => onChange({ ...filter, category: e.target.value || undefined })}
        options={categoryOptions}
        style={{ minWidth: 120 }}
      />
      <Select
        value={filter.effort ?? ""}
        onChange={(e) => onChange({ ...filter, effort: e.target.value || undefined })}
        options={effortOptions}
        style={{ minWidth: 120 }}
      />
      <Select
        value={filter.impact ?? ""}
        onChange={(e) => onChange({ ...filter, impact: e.target.value || undefined })}
        options={impactOptions}
        style={{ minWidth: 120 }}
      />
      {groupKeys && groupKeys.length > 0 && (
        <Select
          value={filter.group_key ?? ""}
          onChange={(e) => onChange({ ...filter, group_key: e.target.value || undefined })}
          options={[
            { value: "", label: "All groups" },
            ...groupKeys.map((k) => ({ value: k, label: k })),
          ]}
          style={{ minWidth: 120 }}
        />
      )}
    </div>
  );
}
