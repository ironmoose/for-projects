DELETE FROM activity_log WHERE entity_type IN ('agent', 'job');

DROP INDEX IF EXISTS idx_jobs_agent_id;
DROP INDEX IF EXISTS idx_jobs_status;
DROP TABLE IF EXISTS jobs;

DROP INDEX IF EXISTS idx_agents_platform_agent;
DROP TABLE IF EXISTS agents;
