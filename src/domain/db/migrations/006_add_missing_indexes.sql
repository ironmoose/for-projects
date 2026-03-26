-- Add missing indexes on columns used in WHERE clause filters.
-- tags.name has a UNIQUE column constraint but no explicit named index.
-- IF NOT EXISTS is defensive against implicit indexes from UNIQUE constraints.

CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(type);
CREATE INDEX IF NOT EXISTS idx_tasks_effort ON tasks(effort);
