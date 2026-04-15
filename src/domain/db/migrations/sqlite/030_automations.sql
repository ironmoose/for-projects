CREATE TABLE automations (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    summary     TEXT,
    prompt      TEXT,
    agent       TEXT,
    category    TEXT,
    is_favorite INTEGER NOT NULL,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);

CREATE INDEX idx_automations_category ON automations(category);
CREATE INDEX idx_automations_is_favorite ON automations(is_favorite);
CREATE INDEX idx_automations_title ON automations(title);
