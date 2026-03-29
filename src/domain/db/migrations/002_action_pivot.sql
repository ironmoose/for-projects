DROP TABLE IF EXISTS actions;
CREATE TABLE actions (
    id TEXT PRIMARY KEY,
    prompt TEXT NOT NULL,
    agent TEXT,
    status TEXT NOT NULL DEFAULT 'todo',
    output TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX idx_actions_status ON actions(status);
CREATE INDEX idx_actions_agent ON actions(agent);

ALTER TABLE projects ADD COLUMN goal_action_id TEXT;
ALTER TABLE projects ADD COLUMN design_action_id TEXT;
ALTER TABLE projects ADD COLUMN requirements_action_id TEXT;

ALTER TABLE tasks ADD COLUMN implementation_action_id TEXT;
ALTER TABLE tasks ADD COLUMN validation_action_id TEXT;
