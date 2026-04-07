CREATE TABLE IF NOT EXISTS tenant (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(160) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO tenant (id, name)
VALUES (1, 'Default Tenant')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE app_user
    ADD COLUMN IF NOT EXISTS tenant_id BIGINT;
UPDATE app_user SET tenant_id = 1 WHERE tenant_id IS NULL;
ALTER TABLE app_user ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE ride_service
    ADD COLUMN IF NOT EXISTS tenant_id BIGINT;
UPDATE ride_service SET tenant_id = 1 WHERE tenant_id IS NULL;
ALTER TABLE ride_service ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE fleet_vehicle
    ADD COLUMN IF NOT EXISTS tenant_id BIGINT;
UPDATE fleet_vehicle SET tenant_id = 1 WHERE tenant_id IS NULL;
ALTER TABLE fleet_vehicle ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE fleet_vehicle_deadline
    ADD COLUMN IF NOT EXISTS tenant_id BIGINT;
UPDATE fleet_vehicle_deadline SET tenant_id = 1 WHERE tenant_id IS NULL;
ALTER TABLE fleet_vehicle_deadline ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE fleet_vehicle_unavailability
    ADD COLUMN IF NOT EXISTS tenant_id BIGINT;
UPDATE fleet_vehicle_unavailability SET tenant_id = 1 WHERE tenant_id IS NULL;
ALTER TABLE fleet_vehicle_unavailability ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE fleet_vehicle_deadline_plan
    ADD COLUMN IF NOT EXISTS tenant_id BIGINT;
UPDATE fleet_vehicle_deadline_plan SET tenant_id = 1 WHERE tenant_id IS NULL;
ALTER TABLE fleet_vehicle_deadline_plan ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE fleet_vehicle_deadline_occurrence
    ADD COLUMN IF NOT EXISTS tenant_id BIGINT;
UPDATE fleet_vehicle_deadline_occurrence SET tenant_id = 1 WHERE tenant_id IS NULL;
ALTER TABLE fleet_vehicle_deadline_occurrence ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE partner
    ADD COLUMN IF NOT EXISTS tenant_id BIGINT;
UPDATE partner SET tenant_id = 1 WHERE tenant_id IS NULL;
ALTER TABLE partner ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE financial_transaction
    ADD COLUMN IF NOT EXISTS tenant_id BIGINT;
UPDATE financial_transaction SET tenant_id = 1 WHERE tenant_id IS NULL;
ALTER TABLE financial_transaction ALTER COLUMN tenant_id SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_app_user_tenant') THEN
        ALTER TABLE app_user
            ADD CONSTRAINT fk_app_user_tenant FOREIGN KEY (tenant_id) REFERENCES tenant(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ride_service_tenant') THEN
        ALTER TABLE ride_service
            ADD CONSTRAINT fk_ride_service_tenant FOREIGN KEY (tenant_id) REFERENCES tenant(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_fleet_vehicle_tenant') THEN
        ALTER TABLE fleet_vehicle
            ADD CONSTRAINT fk_fleet_vehicle_tenant FOREIGN KEY (tenant_id) REFERENCES tenant(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_fleet_deadline_tenant') THEN
        ALTER TABLE fleet_vehicle_deadline
            ADD CONSTRAINT fk_fleet_deadline_tenant FOREIGN KEY (tenant_id) REFERENCES tenant(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_fleet_unavailability_tenant') THEN
        ALTER TABLE fleet_vehicle_unavailability
            ADD CONSTRAINT fk_fleet_unavailability_tenant FOREIGN KEY (tenant_id) REFERENCES tenant(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_fleet_plan_tenant') THEN
        ALTER TABLE fleet_vehicle_deadline_plan
            ADD CONSTRAINT fk_fleet_plan_tenant FOREIGN KEY (tenant_id) REFERENCES tenant(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_fleet_occurrence_tenant') THEN
        ALTER TABLE fleet_vehicle_deadline_occurrence
            ADD CONSTRAINT fk_fleet_occurrence_tenant FOREIGN KEY (tenant_id) REFERENCES tenant(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_partner_tenant') THEN
        ALTER TABLE partner
            ADD CONSTRAINT fk_partner_tenant FOREIGN KEY (tenant_id) REFERENCES tenant(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_financial_transaction_tenant') THEN
        ALTER TABLE financial_transaction
            ADD CONSTRAINT fk_financial_transaction_tenant FOREIGN KEY (tenant_id) REFERENCES tenant(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_app_user_tenant ON app_user (tenant_id);
CREATE INDEX IF NOT EXISTS idx_ride_service_tenant_start ON ride_service (tenant_id, start_at DESC);
CREATE INDEX IF NOT EXISTS idx_fleet_vehicle_tenant_plate ON fleet_vehicle (tenant_id, plate);
CREATE INDEX IF NOT EXISTS idx_fleet_deadline_tenant_due ON fleet_vehicle_deadline (tenant_id, due_date);
CREATE INDEX IF NOT EXISTS idx_fleet_unavailability_tenant_vehicle_range ON fleet_vehicle_unavailability (tenant_id, vehicle_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_fleet_plan_tenant_vehicle ON fleet_vehicle_deadline_plan (tenant_id, vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fleet_occurrence_tenant_vehicle_due ON fleet_vehicle_deadline_occurrence (tenant_id, vehicle_id, due_date);
CREATE INDEX IF NOT EXISTS idx_partner_tenant_name ON partner (tenant_id, ragione_sociale);
CREATE INDEX IF NOT EXISTS idx_financial_transaction_tenant_date ON financial_transaction (tenant_id, transaction_date);
