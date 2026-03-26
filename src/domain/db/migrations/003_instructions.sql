-- Instructions and instruction bindings for the workbench ARN system.
-- Also renames workbenches.name → workbenches.goal.

ALTER TABLE workbenches RENAME COLUMN name TO goal;

CREATE TABLE IF NOT EXISTS instructions (
  id            TEXT PRIMARY KEY,
  workbench_id  TEXT NOT NULL REFERENCES workbenches(id) ON DELETE CASCADE,
  prompt        TEXT NOT NULL,
  position      INTEGER NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(workbench_id, position)
);

CREATE INDEX IF NOT EXISTS idx_instructions_workbench_id ON instructions(workbench_id);

CREATE TABLE IF NOT EXISTS instruction_bindings (
  id              TEXT PRIMARY KEY,
  instruction_id  TEXT NOT NULL REFERENCES instructions(id) ON DELETE CASCADE,
  arn             TEXT NOT NULL,
  kind            TEXT NOT NULL CHECK (kind IN ('input', 'output', 'context')),
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_instruction_bindings_instruction_id ON instruction_bindings(instruction_id);
CREATE INDEX IF NOT EXISTS idx_instruction_bindings_arn ON instruction_bindings(arn);
