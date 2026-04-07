ALTER TABLE tenant
    ADD COLUMN IF NOT EXISTS business_name VARCHAR(160),
    ADD COLUMN IF NOT EXISTS vat_number VARCHAR(40),
    ADD COLUMN IF NOT EXISTS tax_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS sdi_code VARCHAR(16),
    ADD COLUMN IF NOT EXISTS pec_email VARCHAR(190),
    ADD COLUMN IF NOT EXISTS contact_email VARCHAR(190),
    ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(40),
    ADD COLUMN IF NOT EXISTS contact_person VARCHAR(160),
    ADD COLUMN IF NOT EXISTS address_line VARCHAR(255),
    ADD COLUMN IF NOT EXISTS address_city VARCHAR(120),
    ADD COLUMN IF NOT EXISTS address_province VARCHAR(80),
    ADD COLUMN IF NOT EXISTS address_postal_code VARCHAR(20),
    ADD COLUMN IF NOT EXISTS address_country VARCHAR(80),
    ADD COLUMN IF NOT EXISTS timezone VARCHAR(64),
    ADD COLUMN IF NOT EXISTS currency VARCHAR(8),
    ADD COLUMN IF NOT EXISTS language VARCHAR(8),
    ADD COLUMN IF NOT EXISTS notify_email_enabled BOOLEAN,
    ADD COLUMN IF NOT EXISTS notify_sms_enabled BOOLEAN,
    ADD COLUMN IF NOT EXISTS notify_push_enabled BOOLEAN,
    ADD COLUMN IF NOT EXISTS status VARCHAR(20),
    ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20),
    ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(20),
    ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS primary_color VARCHAR(16),
    ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(16);

UPDATE tenant
SET business_name = name
WHERE business_name IS NULL;

UPDATE tenant
SET timezone = COALESCE(timezone, 'Europe/Rome'),
    currency = COALESCE(currency, 'EUR'),
    language = COALESCE(language, 'it'),
    notify_email_enabled = COALESCE(notify_email_enabled, TRUE),
    notify_sms_enabled = COALESCE(notify_sms_enabled, FALSE),
    notify_push_enabled = COALESCE(notify_push_enabled, FALSE),
    status = COALESCE(status, 'ACTIVE'),
    subscription_status = COALESCE(subscription_status, 'ACTIVE'),
    subscription_plan = COALESCE(subscription_plan, 'ENTERPRISE'),
    contact_email = COALESCE(contact_email, 'admin@rideops.local')
WHERE timezone IS NULL
   OR currency IS NULL
   OR language IS NULL
   OR notify_email_enabled IS NULL
   OR notify_sms_enabled IS NULL
   OR notify_push_enabled IS NULL
   OR status IS NULL
   OR subscription_status IS NULL
   OR subscription_plan IS NULL
   OR contact_email IS NULL;

ALTER TABLE tenant
    ALTER COLUMN business_name SET NOT NULL,
    ALTER COLUMN timezone SET NOT NULL,
    ALTER COLUMN currency SET NOT NULL,
    ALTER COLUMN language SET NOT NULL,
    ALTER COLUMN notify_email_enabled SET NOT NULL,
    ALTER COLUMN notify_sms_enabled SET NOT NULL,
    ALTER COLUMN notify_push_enabled SET NOT NULL,
    ALTER COLUMN status SET NOT NULL,
    ALTER COLUMN subscription_status SET NOT NULL,
    ALTER COLUMN subscription_plan SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uk_tenant_business_name ON tenant (business_name);
CREATE INDEX IF NOT EXISTS idx_tenant_contact_email ON tenant (contact_email);

ALTER TABLE email_outbox
    ADD COLUMN IF NOT EXISTS tenant_id BIGINT;

UPDATE email_outbox
SET tenant_id = 1
WHERE tenant_id IS NULL;

ALTER TABLE email_outbox
    ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE password_reset_token
    ADD COLUMN IF NOT EXISTS tenant_id BIGINT;

UPDATE password_reset_token prt
SET tenant_id = u.tenant_id
FROM app_user u
WHERE prt.tenant_id IS NULL
  AND prt.user_id = u.id;

UPDATE password_reset_token
SET tenant_id = 1
WHERE tenant_id IS NULL;

ALTER TABLE password_reset_token
    ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE user_admin_audit_log
    ADD COLUMN IF NOT EXISTS tenant_id BIGINT;

UPDATE user_admin_audit_log log
SET tenant_id = u.tenant_id
FROM app_user u
WHERE log.tenant_id IS NULL
  AND log.target_user_id = u.id;

UPDATE user_admin_audit_log
SET tenant_id = 1
WHERE tenant_id IS NULL;

ALTER TABLE user_admin_audit_log
    ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE partner_service_communication
    ADD COLUMN IF NOT EXISTS tenant_id BIGINT;

UPDATE partner_service_communication c
SET tenant_id = s.tenant_id
FROM ride_service s
WHERE c.tenant_id IS NULL
  AND c.service_id = s.id;

UPDATE partner_service_communication
SET tenant_id = 1
WHERE tenant_id IS NULL;

ALTER TABLE partner_service_communication
    ALTER COLUMN tenant_id SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_email_outbox_tenant') THEN
        ALTER TABLE email_outbox
            ADD CONSTRAINT fk_email_outbox_tenant FOREIGN KEY (tenant_id) REFERENCES tenant(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_password_reset_token_tenant') THEN
        ALTER TABLE password_reset_token
            ADD CONSTRAINT fk_password_reset_token_tenant FOREIGN KEY (tenant_id) REFERENCES tenant(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_admin_audit_log_tenant') THEN
        ALTER TABLE user_admin_audit_log
            ADD CONSTRAINT fk_user_admin_audit_log_tenant FOREIGN KEY (tenant_id) REFERENCES tenant(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_partner_service_communication_tenant') THEN
        ALTER TABLE partner_service_communication
            ADD CONSTRAINT fk_partner_service_communication_tenant FOREIGN KEY (tenant_id) REFERENCES tenant(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_email_outbox_tenant_created_at ON email_outbox (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_password_reset_token_tenant_expires_at ON password_reset_token (tenant_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_user_admin_audit_log_tenant_created_at ON user_admin_audit_log (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_partner_service_comm_tenant_service ON partner_service_communication (tenant_id, service_id, created_at DESC);
