ALTER TABLE ride_service
    ADD COLUMN IF NOT EXISTS external_booking_reference BIGINT,
    ADD COLUMN IF NOT EXISTS internal_booking_reference VARCHAR(32),
    ADD COLUMN IF NOT EXISTS client_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS client_phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS client_email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS passengers_count INTEGER,
    ADD COLUMN IF NOT EXISTS itinerary TEXT;

CREATE INDEX IF NOT EXISTS idx_ride_service_internal_booking_reference
    ON ride_service (internal_booking_reference);
