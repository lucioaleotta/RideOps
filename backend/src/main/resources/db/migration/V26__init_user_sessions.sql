CREATE TABLE IF NOT EXISTS user_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    tenant_id BIGINT NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    device_type VARCHAR(20) NOT NULL DEFAULT 'unknown',
    anomaly TEXT,
    CONSTRAINT chk_user_sessions_device_type
        CHECK (device_type IN ('desktop', 'mobile', 'tablet', 'unknown'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_tenant_id ON user_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON user_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_ip ON user_sessions(ip_address);
