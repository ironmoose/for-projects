CREATE TABLE IF NOT EXISTS automations (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    summary     TEXT,
    prompt      TEXT,
    agent       TEXT,
    category    TEXT,
    is_favorite BOOLEAN NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_automations_category ON automations(category);
CREATE INDEX IF NOT EXISTS idx_automations_is_favorite ON automations(is_favorite);
CREATE INDEX IF NOT EXISTS idx_automations_title ON automations(title);
