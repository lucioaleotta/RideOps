ALTER TABLE ride_service
    ADD COLUMN IF NOT EXISTS assigned_vehicle_id BIGINT;

CREATE INDEX IF NOT EXISTS idx_ride_service_assigned_vehicle_id
    ON ride_service (assigned_vehicle_id);
