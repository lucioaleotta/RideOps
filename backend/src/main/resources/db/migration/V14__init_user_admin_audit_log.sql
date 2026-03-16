CREATE TABLE IF NOT EXISTS user_admin_audit_log (
    id BIGSERIAL PRIMARY KEY,
    target_user_id BIGINT NOT NULL,
    target_userid VARCHAR(80) NOT NULL,
    admin_user_id BIGINT,
    admin_userid VARCHAR(80) NOT NULL,
    action VARCHAR(40) NOT NULL,
    changed_fields VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_admin_audit_target_user
        FOREIGN KEY (target_user_id) REFERENCES app_user(id),
    CONSTRAINT fk_user_admin_audit_admin_user
        FOREIGN KEY (admin_user_id) REFERENCES app_user(id)
);

CREATE INDEX IF NOT EXISTS idx_user_admin_audit_created_at
    ON user_admin_audit_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_admin_audit_admin_userid
    ON user_admin_audit_log (admin_userid);
