-- Rename the workbenches table to workflows.
-- The instructions.workbench_id FK is NOT renamed here because migration 013
-- rebuilds the instructions table entirely, replacing workbench_id with phase_id.

ALTER TABLE workbenches RENAME TO workflows;
