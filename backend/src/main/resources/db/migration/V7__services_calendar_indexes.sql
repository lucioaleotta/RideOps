CREATE INDEX IF NOT EXISTS idx_ride_service_start_at_status
    ON ride_service (start_at, status);

CREATE INDEX IF NOT EXISTS idx_ride_service_start_at_type
    ON ride_service (start_at, service_type);

CREATE INDEX IF NOT EXISTS idx_ride_service_driver_start_at
    ON ride_service (assigned_driver_id, start_at);

CREATE INDEX IF NOT EXISTS idx_ride_service_open_unassigned_start_at
    ON ride_service (start_at)
    WHERE assigned_driver_id IS NULL AND status = 'OPEN';
