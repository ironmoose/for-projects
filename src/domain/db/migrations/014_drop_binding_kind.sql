-- Drop the kind column from instruction_bindings.
-- Requires SQLite 3.35+; Bun bundles 3.45+.

ALTER TABLE instruction_bindings DROP COLUMN kind;
