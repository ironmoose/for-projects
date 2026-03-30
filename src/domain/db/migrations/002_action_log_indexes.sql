CREATE INDEX IF NOT EXISTS idx_action_log_status ON action_log(status);
CREATE INDEX IF NOT EXISTS idx_action_log_started_at ON action_log(started_at);
