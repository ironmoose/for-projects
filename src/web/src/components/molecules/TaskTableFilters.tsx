import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "../atoms/Input";
import { Select } from "../atoms/Select";
import type { TaskFilter } from "../../hooks/useProjectTasks";

interface TaskTableFiltersProps {
  filter: TaskFilter;
  onChange: (f: TaskFilter) => void;
}

export function TaskTableFilters({ filter, onChange }: TaskTableFiltersProps) {
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
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
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
        options={[
          { value: "", label: "All statuses" },
          { value: "in_progress,todo", label: "Active" },
          { value: "todo", label: "Todo" },
          { value: "in_progress", label: "In progress" },
          { value: "done", label: "Done" },
          { value: "archived", label: "Archived" },
        ]}
        style={{ minWidth: 120 }}
      />
      <Select
        value={filter.category ?? ""}
        onChange={(e) => onChange({ ...filter, category: e.target.value || undefined })}
        options={[
          { value: "", label: "All categories" },
          { value: "feature", label: "Feature" },
          { value: "bugfix", label: "Bugfix" },
          { value: "refactor", label: "Refactor" },
          { value: "test", label: "Test" },
          { value: "perf", label: "Perf" },
          { value: "infra", label: "Infra" },
          { value: "docs", label: "Docs" },
          { value: "security", label: "Security" },
          { value: "design", label: "Design" },
          { value: "chore", label: "Chore" },
        ]}
        style={{ minWidth: 120 }}
      />
      <Select
        value={filter.effort ?? ""}
        onChange={(e) => onChange({ ...filter, effort: e.target.value || undefined })}
        options={[
          { value: "", label: "All efforts" },
          { value: "trivial", label: "Trivial" },
          { value: "low", label: "Low" },
          { value: "medium", label: "Medium" },
          { value: "high", label: "High" },
          { value: "extreme", label: "Extreme" },
        ]}
        style={{ minWidth: 120 }}
      />
      <Select
        value={filter.impact ?? ""}
        onChange={(e) => onChange({ ...filter, impact: e.target.value || undefined })}
        options={[
          { value: "", label: "All impacts" },
          { value: "trivial", label: "Trivial" },
          { value: "low", label: "Low" },
          { value: "medium", label: "Medium" },
          { value: "high", label: "High" },
          { value: "extreme", label: "Extreme" },
        ]}
        style={{ minWidth: 120 }}
      />
    </div>
  );
}
