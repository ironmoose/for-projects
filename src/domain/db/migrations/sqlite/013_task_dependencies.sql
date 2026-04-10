CREATE TABLE task_dependencies (
    source_task_id  TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    target_task_id  TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    dependency_type TEXT NOT NULL,
    created_at      TEXT NOT NULL,
    PRIMARY KEY (source_task_id, target_task_id),
    CHECK (source_task_id != target_task_id),
    CHECK (dependency_type IN ('blocks', 'relates_to'))
);
CREATE INDEX idx_task_dependencies_target ON task_dependencies(target_task_id);
