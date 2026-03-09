CREATE TABLE IF NOT EXISTS fleet_vehicle_deadline_plan (
    id BIGSERIAL PRIMARY KEY,
    vehicle_id BIGINT NOT NULL,
    deadline_type VARCHAR(20) NOT NULL,
    title VARCHAR(120) NOT NULL,
    description TEXT,
    recurrence_months INTEGER NOT NULL CHECK (recurrence_months > 0),
    next_due_date DATE NOT NULL,
    standard_cost_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_fleet_plan_vehicle FOREIGN KEY (vehicle_id) REFERENCES fleet_vehicle(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS fleet_vehicle_deadline_occurrence (
    id BIGSERIAL PRIMARY KEY,
    vehicle_id BIGINT NOT NULL,
    plan_id BIGINT,
    deadline_type VARCHAR(20) NOT NULL,
    title VARCHAR(120) NOT NULL,
    description TEXT,
    due_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL,
    cost_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL,
    notes TEXT,
    payment_date DATE,
    execution_date DATE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_fleet_occ_vehicle FOREIGN KEY (vehicle_id) REFERENCES fleet_vehicle(id) ON DELETE CASCADE,
    CONSTRAINT fk_fleet_occ_plan FOREIGN KEY (plan_id) REFERENCES fleet_vehicle_deadline_plan(id) ON DELETE SET NULL
);

INSERT INTO fleet_vehicle_deadline_occurrence (
    vehicle_id,
    plan_id,
    deadline_type,
    title,
    description,
    due_date,
    status,
    cost_amount,
    currency,
    notes,
    payment_date,
    execution_date,
    created_at,
    updated_at
)
SELECT
    vehicle_id,
    NULL,
    deadline_type,
    COALESCE(title, 'Scadenza'),
    description,
    due_date,
    status,
    COALESCE(cost_amount, 0),
    COALESCE(currency, 'EUR'),
    notes,
    payment_date,
    execution_date,
    created_at,
    updated_at
FROM fleet_vehicle_deadline
WHERE NOT EXISTS (
    SELECT 1 FROM fleet_vehicle_deadline_occurrence occ
    WHERE occ.vehicle_id = fleet_vehicle_deadline.vehicle_id
      AND occ.due_date = fleet_vehicle_deadline.due_date
      AND occ.title = COALESCE(fleet_vehicle_deadline.title, 'Scadenza')
);

CREATE INDEX IF NOT EXISTS idx_fleet_occ_vehicle_due ON fleet_vehicle_deadline_occurrence (vehicle_id, due_date);
CREATE INDEX IF NOT EXISTS idx_fleet_occ_status_due ON fleet_vehicle_deadline_occurrence (status, due_date);
CREATE INDEX IF NOT EXISTS idx_fleet_plan_vehicle_active ON fleet_vehicle_deadline_plan (vehicle_id, active);
