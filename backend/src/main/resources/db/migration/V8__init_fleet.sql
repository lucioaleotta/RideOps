CREATE TABLE IF NOT EXISTS fleet_vehicle (
    id BIGSERIAL PRIMARY KEY,
    plate VARCHAR(20) NOT NULL UNIQUE,
    seats INTEGER NOT NULL CHECK (seats > 0),
    vehicle_type VARCHAR(20) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fleet_vehicle_deadline (
    id BIGSERIAL PRIMARY KEY,
    vehicle_id BIGINT NOT NULL,
    deadline_type VARCHAR(20) NOT NULL,
    due_date DATE NOT NULL,
    notes TEXT,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_fleet_deadline_vehicle
        FOREIGN KEY (vehicle_id) REFERENCES fleet_vehicle(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS fleet_vehicle_unavailability (
    id BIGSERIAL PRIMARY KEY,
    vehicle_id BIGINT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_fleet_unavailability_vehicle
        FOREIGN KEY (vehicle_id) REFERENCES fleet_vehicle(id) ON DELETE CASCADE,
    CONSTRAINT chk_fleet_unavailability_range CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_fleet_vehicle_plate ON fleet_vehicle (plate);
CREATE INDEX IF NOT EXISTS idx_fleet_deadline_vehicle_due ON fleet_vehicle_deadline (vehicle_id, due_date);
CREATE INDEX IF NOT EXISTS idx_fleet_deadline_due_open ON fleet_vehicle_deadline (due_date) WHERE completed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fleet_unavailability_vehicle_range ON fleet_vehicle_unavailability (vehicle_id, start_date, end_date);
