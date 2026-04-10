-- Projects: drop goal, requirements, design
ALTER TABLE projects DROP COLUMN goal;
ALTER TABLE projects DROP COLUMN requirements;
ALTER TABLE projects DROP COLUMN design;

-- Tasks: drop plan, description, implementation, acceptance_criteria
ALTER TABLE tasks DROP COLUMN plan;
ALTER TABLE tasks DROP COLUMN description;
ALTER TABLE tasks DROP COLUMN implementation;
ALTER TABLE tasks DROP COLUMN acceptance_criteria;
