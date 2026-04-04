INSERT INTO document_references (entity_type, entity_id, document_id, type)
SELECT 'project', project_id, document_id, 'reference'
FROM project_documents;

DROP TABLE project_documents;
