-- Migration 003: Rename actions → agents, action_log → runs
-- Uses the recreate pattern since SQLite lacks DROP COLUMN / full RENAME COLUMN support.

-- ============================================================
-- 1. Recreate `actions` as `agents`
--    - Drop `kind` column
--    - Add `identifier` (TEXT NOT NULL UNIQUE) — seeded from old `kind`
--    - Add `enabled` (INTEGER NOT NULL, 0 or 1)
--    - Keep `id`, `prompt`, `agent`, `created_at`, `updated_at`
-- ============================================================

CREATE TABLE agents (
    id         TEXT PRIMARY KEY,
    identifier TEXT NOT NULL UNIQUE,
    prompt     TEXT NOT NULL,
    agent      TEXT NOT NULL CHECK (agent IN ('tab:orchestrator', 'tab:executor')),
    enabled    INTEGER NOT NULL CHECK (enabled IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

INSERT INTO agents (id, identifier, prompt, agent, enabled, created_at, updated_at)
SELECT id, kind, prompt, agent, 1, created_at, updated_at
FROM actions;

DROP TABLE actions;

-- ============================================================
-- 2. Recreate `action_log` as `runs`
--    - `action_id` → `agent` (free-form TEXT, no FK)
--    - `status` CHECK: add 'todo' and 'cancelled'
--    - Keep `id`, `entity_type`, `entity_id`, `output`, `started_at`, `finished_at`
-- ============================================================

CREATE TABLE runs (
    id          TEXT PRIMARY KEY,
    agent       TEXT NOT NULL,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('project', 'task')),
    entity_id   TEXT NOT NULL,
    status      TEXT NOT NULL CHECK (status IN ('todo', 'running', 'done', 'failed', 'cancelled')),
    output      TEXT,
    started_at  TEXT NOT NULL,
    finished_at TEXT
);

-- Populate from old table, mapping action_id FK to the agent identifier string.
-- `actions` is already dropped but data lives in `agents` with `identifier` = old `kind`.
INSERT INTO runs (id, agent, entity_type, entity_id, status, output, started_at, finished_at)
SELECT al.id, ag.identifier, al.entity_type, al.entity_id, al.status, al.output, al.started_at, al.finished_at
FROM action_log al
JOIN agents ag ON ag.id = al.action_id;

DROP TABLE action_log;

-- ============================================================
-- 3. Recreate indexes on `runs`
-- ============================================================

CREATE INDEX idx_runs_entity     ON runs(entity_type, entity_id);
CREATE INDEX idx_runs_agent      ON runs(agent);
CREATE INDEX idx_runs_status     ON runs(status);
CREATE INDEX idx_runs_started_at ON runs(started_at);
