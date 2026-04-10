ALTER TABLE documents ADD COLUMN favorite INTEGER;
UPDATE documents SET favorite = 0;
