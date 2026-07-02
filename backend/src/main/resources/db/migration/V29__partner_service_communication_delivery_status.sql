ALTER TABLE partner_service_communication
    ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(10);

UPDATE partner_service_communication
SET delivery_status = 'OK'
WHERE delivery_status IS NULL;

ALTER TABLE partner_service_communication
    ALTER COLUMN delivery_status SET NOT NULL;

ALTER TABLE partner_service_communication
    ADD COLUMN IF NOT EXISTS delivery_attempts INTEGER;

UPDATE partner_service_communication
SET delivery_attempts = 1
WHERE delivery_attempts IS NULL;

ALTER TABLE partner_service_communication
    ALTER COLUMN delivery_attempts SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_partner_service_comm_delivery_status
    ON partner_service_communication (tenant_id, service_id, delivery_status, created_at DESC);
