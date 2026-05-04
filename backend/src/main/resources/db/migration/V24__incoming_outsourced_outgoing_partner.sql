-- V24: Add outgoing_partner_id column to ride_service for INCOMING_OUTSOURCED type
-- This column stores the NCC executor partner when a service is received from one partner
-- and then outsourced to a different NCC company for execution.

ALTER TABLE ride_service
    ADD COLUMN IF NOT EXISTS outgoing_partner_id BIGINT;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ride_service_outgoing_partner') THEN
        ALTER TABLE ride_service
            ADD CONSTRAINT fk_ride_service_outgoing_partner
            FOREIGN KEY (outgoing_partner_id) REFERENCES partner(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ride_service_outgoing_partner
    ON ride_service (outgoing_partner_id);

-- Widen the service_assignment_type column to accommodate 'INCOMING_OUTSOURCED' (20 chars)
-- Adding extra margin to VARCHAR(25) for future safety
ALTER TABLE ride_service
    ALTER COLUMN service_assignment_type TYPE VARCHAR(25);
