CREATE INDEX IF NOT EXISTS idx_tasks_effort ON tasks(effort);
CREATE INDEX IF NOT EXISTS idx_tasks_impact ON tasks(impact);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
CREATE INDEX IF NOT EXISTS idx_tasks_project_status ON tasks(project_id, status);
