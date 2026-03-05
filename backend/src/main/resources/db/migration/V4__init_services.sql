CREATE TABLE IF NOT EXISTS ride_service (
    id BIGSERIAL PRIMARY KEY,
    start_at TIMESTAMP NOT NULL,
    pickup_location VARCHAR(255) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    service_type VARCHAR(20) NOT NULL,
    duration_hours INTEGER,
    notes TEXT,
    price NUMERIC(12,2),
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ride_service_start_at ON ride_service (start_at DESC);
CREATE INDEX IF NOT EXISTS idx_ride_service_status ON ride_service (status);