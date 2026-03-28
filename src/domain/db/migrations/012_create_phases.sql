-- Create the phases table as an intermediate grouping layer between
-- workflows and instructions.  Seed one default phase per existing workflow.

CREATE TABLE IF NOT EXISTS phases (
  id           TEXT PRIMARY KEY,
  workflow_id  TEXT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  position     INTEGER NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(workflow_id, position)
);

CREATE INDEX IF NOT EXISTS idx_phases_workflow_id ON phases(workflow_id);

-- Seed a default "Phase 1" at position 0 for every existing workflow.
INSERT INTO phases (id, workflow_id, title, position, created_at, updated_at)
SELECT 'PHASE_' || id, id, 'Phase 1', 0, created_at, created_at
FROM workflows;
