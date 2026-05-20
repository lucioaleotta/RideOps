ALTER TABLE user_sessions
    ADD COLUMN IF NOT EXISTS country_code VARCHAR(8),
    ADD COLUMN IF NOT EXISTS country_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS city VARCHAR(100),
    ADD COLUMN IF NOT EXISTS user_agent_raw TEXT,
    ADD COLUMN IF NOT EXISTS ua_browser VARCHAR(50),
    ADD COLUMN IF NOT EXISTS ua_os VARCHAR(50),
    ADD COLUMN IF NOT EXISTS anomaly TEXT;

UPDATE user_sessions
SET user_agent_raw = user_agent
WHERE user_agent_raw IS NULL
  AND user_agent IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_country ON user_sessions(country_code);
