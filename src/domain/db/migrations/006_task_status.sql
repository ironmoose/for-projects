ALTER TABLE tasks ADD COLUMN status TEXT;
UPDATE tasks SET status = 'todo' WHERE status IS NULL;
CREATE INDEX idx_tasks_status ON tasks(status);
