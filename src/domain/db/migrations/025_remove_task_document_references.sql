-- Remove all document references linked to tasks.
-- Task summary is now the only text field; documents remain for projects only.
DELETE FROM document_references WHERE entity_type = 'task';
