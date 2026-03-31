ALTER TABLE tasks ADD COLUMN group_key TEXT;
CREATE INDEX idx_tasks_project_id_group_key ON tasks(project_id, group_key);
