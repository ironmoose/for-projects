CREATE TABLE projects (
    id           TEXT PRIMARY KEY,
    title        TEXT NOT NULL,
    goal         TEXT,
    requirements TEXT,
    design       TEXT,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
);

CREATE TABLE tasks (
    id         TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title      TEXT NOT NULL,
    plan       TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);

CREATE TABLE actions (
    id         TEXT PRIMARY KEY,
    kind       TEXT NOT NULL UNIQUE CHECK (kind IN ('plan', 'goal', 'requirements', 'design')),
    prompt     TEXT NOT NULL,
    agent      TEXT NOT NULL CHECK (agent IN ('tab:orchestrator', 'tab:executor')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE action_log (
    id          TEXT PRIMARY KEY,
    action_id   TEXT NOT NULL REFERENCES actions(id),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('project', 'task')),
    entity_id   TEXT NOT NULL,
    status      TEXT NOT NULL CHECK (status IN ('running', 'done', 'failed')),
    output      TEXT,
    started_at  TEXT NOT NULL,
    finished_at TEXT
);
CREATE INDEX idx_action_log_entity ON action_log(entity_type, entity_id);
CREATE INDEX idx_action_log_action ON action_log(action_id);
