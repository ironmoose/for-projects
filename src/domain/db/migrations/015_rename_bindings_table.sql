-- Rename instruction_bindings → bindings.

ALTER TABLE instruction_bindings RENAME TO bindings;

DROP INDEX IF EXISTS idx_instruction_bindings_instruction_id;
DROP INDEX IF EXISTS idx_instruction_bindings_arn;

CREATE INDEX IF NOT EXISTS idx_bindings_instruction_id ON bindings(instruction_id);
CREATE INDEX IF NOT EXISTS idx_bindings_arn ON bindings(arn);
