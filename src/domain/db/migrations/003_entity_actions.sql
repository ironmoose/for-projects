-- 003: Extract action bindings into entity_actions join table,
--      drop the now-redundant columns, and trim status/output from actions.

-- 1. Create entity_actions table
CREATE TABLE entity_actions (
    entity_type TEXT NOT NULL,
    entity_id   TEXT NOT NULL,
    role        TEXT NOT NULL,
    action_id   TEXT NOT NULL REFERENCES actions(id),
    status      TEXT NOT NULL,
    output      TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    PRIMARY KEY (entity_type, entity_id, role)
);
CREATE INDEX idx_entity_actions_action_id ON entity_actions(action_id);
CREATE INDEX idx_entity_actions_status ON entity_actions(status);

-- 2. Migrate project action references
INSERT INTO entity_actions (entity_type, entity_id, role, action_id, status, output, created_at, updated_at)
SELECT 'project', p.id, 'goal', p.goal_action_id, a.status, a.output, a.created_at, a.updated_at
FROM projects p JOIN actions a ON a.id = p.goal_action_id
WHERE p.goal_action_id IS NOT NULL;

INSERT INTO entity_actions (entity_type, entity_id, role, action_id, status, output, created_at, updated_at)
SELECT 'project', p.id, 'design', p.design_action_id, a.status, a.output, a.created_at, a.updated_at
FROM projects p JOIN actions a ON a.id = p.design_action_id
WHERE p.design_action_id IS NOT NULL;

INSERT INTO entity_actions (entity_type, entity_id, role, action_id, status, output, created_at, updated_at)
SELECT 'project', p.id, 'requirements', p.requirements_action_id, a.status, a.output, a.created_at, a.updated_at
FROM projects p JOIN actions a ON a.id = p.requirements_action_id
WHERE p.requirements_action_id IS NOT NULL;

-- 3. Migrate task action references
INSERT INTO entity_actions (entity_type, entity_id, role, action_id, status, output, created_at, updated_at)
SELECT 'task', t.id, 'implementation', t.implementation_action_id, a.status, a.output, a.created_at, a.updated_at
FROM tasks t JOIN actions a ON a.id = t.implementation_action_id
WHERE t.implementation_action_id IS NOT NULL;

INSERT INTO entity_actions (entity_type, entity_id, role, action_id, status, output, created_at, updated_at)
SELECT 'task', t.id, 'validation', t.validation_action_id, a.status, a.output, a.created_at, a.updated_at
FROM tasks t JOIN actions a ON a.id = t.validation_action_id
WHERE t.validation_action_id IS NOT NULL;

-- 4. Drop action columns from projects and tasks
ALTER TABLE projects DROP COLUMN goal_action_id;
ALTER TABLE projects DROP COLUMN design_action_id;
ALTER TABLE projects DROP COLUMN requirements_action_id;

ALTER TABLE tasks DROP COLUMN implementation_action_id;
ALTER TABLE tasks DROP COLUMN validation_action_id;

-- 5. Recreate actions table without status and output
CREATE TABLE actions_new (
    id TEXT PRIMARY KEY,
    prompt TEXT NOT NULL,
    agent TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
INSERT INTO actions_new (id, prompt, agent, created_at, updated_at)
SELECT id, prompt, agent, created_at, updated_at FROM actions;
DROP TABLE actions;
ALTER TABLE actions_new RENAME TO actions;
CREATE INDEX idx_actions_agent ON actions(agent);
