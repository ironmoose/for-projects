ALTER TABLE tasks ADD COLUMN is_blocked INTEGER NOT NULL DEFAULT 0;

-- Backfill: a task is blocked if any incomplete task blocks it
UPDATE tasks SET is_blocked = 1
WHERE id IN (
    SELECT DISTINCT td.target_task_id
    FROM task_dependencies td
    JOIN tasks st ON st.id = td.source_task_id
    WHERE td.dependency_type = 'blocks'
      AND st.status NOT IN ('done', 'archived')
);
