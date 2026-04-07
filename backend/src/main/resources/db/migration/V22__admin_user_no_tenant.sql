-- Gli utenti ADMIN non appartengono a nessun tenant.
-- Rendiamo tenant_id nullable in app_user e user_admin_audit_log.

ALTER TABLE app_user ALTER COLUMN tenant_id DROP NOT NULL;
UPDATE app_user SET tenant_id = NULL WHERE role = 'ADMIN';

-- Le voci di audit generate da un ADMIN non hanno tenant_id
ALTER TABLE user_admin_audit_log ALTER COLUMN tenant_id DROP NOT NULL;
