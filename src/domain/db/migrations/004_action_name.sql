ALTER TABLE actions ADD COLUMN name TEXT NOT NULL DEFAULT '';
UPDATE actions SET name = substr(prompt, 1, 80) WHERE name = '';
