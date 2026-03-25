ALTER TABLE ride_service
    ADD COLUMN IF NOT EXISTS service_assignment_type VARCHAR(20) NOT NULL DEFAULT 'INTERNAL',
    ADD COLUMN IF NOT EXISTS partner_id BIGINT,
    ADD COLUMN IF NOT EXISTS price_partner NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS margin NUMERIC(12,2);

UPDATE ride_service
SET service_assignment_type = 'INTERNAL'
WHERE service_assignment_type IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_ride_service_partner'
    ) THEN
        ALTER TABLE ride_service
            ADD CONSTRAINT fk_ride_service_partner
            FOREIGN KEY (partner_id)
            REFERENCES partner(id);
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_ride_service_assignment_type
    ON ride_service (service_assignment_type);

CREATE INDEX IF NOT EXISTS idx_ride_service_partner
    ON ride_service (partner_id);
