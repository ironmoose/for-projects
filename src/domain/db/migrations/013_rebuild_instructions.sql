-- Rebuild the instructions table: replace workbench_id with phase_id FK,
-- drop position, parallel, actor, and status columns.

CREATE TABLE instructions_new (
  id          TEXT PRIMARY KEY,
  phase_id    TEXT NOT NULL REFERENCES phases(id) ON DELETE CASCADE,
  prompt      TEXT NOT NULL,
  output      TEXT,
  agent       TEXT DEFAULT NULL,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT INTO instructions_new (id, phase_id, prompt, output, agent, created_at, updated_at)
SELECT i.id, 'PHASE_' || i.workbench_id, i.prompt, i.output, i.agent, i.created_at, i.updated_at
FROM instructions i;

DROP TABLE instructions;
ALTER TABLE instructions_new RENAME TO instructions;
CREATE INDEX IF NOT EXISTS idx_instructions_phase_id ON instructions(phase_id);
