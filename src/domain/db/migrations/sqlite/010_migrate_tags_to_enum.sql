ALTER TABLE tags RENAME COLUMN name TO kind;

UPDATE tags SET kind = 'decision' WHERE kind = 'decisions';
UPDATE tags SET kind = 'ui' WHERE kind = 'frontend';

DELETE FROM entity_tags WHERE tag_id IN (
  SELECT id FROM tags WHERE kind NOT IN (
    'ui','data','integration','infra','domain',
    'architecture','conventions','guide','reference','decision','troubleshooting',
    'security','performance','testing','accessibility'
  )
);

DELETE FROM tags WHERE kind NOT IN (
  'ui','data','integration','infra','domain',
  'architecture','conventions','guide','reference','decision','troubleshooting',
  'security','performance','testing','accessibility'
);
