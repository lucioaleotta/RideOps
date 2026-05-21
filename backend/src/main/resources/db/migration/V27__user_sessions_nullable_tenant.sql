-- tenant_id può essere NULL per utenti ADMIN che non appartengono a nessun tenant
ALTER TABLE user_sessions
    ALTER COLUMN tenant_id DROP NOT NULL,
    DROP CONSTRAINT IF EXISTS user_sessions_tenant_id_fkey;

ALTER TABLE user_sessions
    ADD CONSTRAINT user_sessions_tenant_id_fkey
        FOREIGN KEY (tenant_id) REFERENCES tenant(id) ON DELETE CASCADE;
