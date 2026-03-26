-- Remove workflow_nodes table, superseded by instructions.

DROP INDEX IF EXISTS idx_workflow_nodes_workbench_id;
DROP TABLE IF EXISTS workflow_nodes;
