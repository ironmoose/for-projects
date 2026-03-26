-- Workbenches and workflow nodes
-- Uses IF NOT EXISTS so this is safe to run against existing databases.

CREATE TABLE IF NOT EXISTS workbenches (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS workflow_nodes (
  id            TEXT PRIMARY KEY,
  workbench_id  TEXT NOT NULL REFERENCES workbenches(id) ON DELETE CASCADE,
  type          TEXT NOT NULL
                CHECK (type IN ('implementation', 'refinement', 'review', 'research', 'validation', 'goal_defining', 'requirements_gathering', 'documentation', 'design')),
  position      INTEGER NOT NULL,
  output        TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(workbench_id, position)
);

CREATE INDEX IF NOT EXISTS idx_workflow_nodes_workbench_id ON workflow_nodes(workbench_id);
