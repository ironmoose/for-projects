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
    id                  TEXT PRIMARY KEY,
    project_id          TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title               TEXT NOT NULL,
    plan                TEXT,
    description         TEXT,
    implementation      TEXT,
    acceptance_criteria TEXT,
    created_at          TEXT NOT NULL,
    updated_at          TEXT NOT NULL
);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
