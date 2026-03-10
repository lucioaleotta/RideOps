ALTER TABLE fleet_vehicle_deadline
    ADD COLUMN IF NOT EXISTS title VARCHAR(120),
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS status VARCHAR(20),
    ADD COLUMN IF NOT EXISTS cost_amount NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS currency VARCHAR(3),
    ADD COLUMN IF NOT EXISTS payment_date DATE,
    ADD COLUMN IF NOT EXISTS execution_date DATE;

UPDATE fleet_vehicle_deadline
SET deadline_type = CASE deadline_type
    WHEN 'INSURANCE' THEN 'ASSICURAZIONE'
    WHEN 'TAX' THEN 'BOLLO'
    WHEN 'ROAD_TAX' THEN 'BOLLO'
    WHEN 'INSPECTION' THEN 'REVISIONE'
    WHEN 'SERVICE' THEN 'TAGLIANDO'
    WHEN 'OTHER' THEN 'ALTRO'
    ELSE deadline_type
END;

UPDATE fleet_vehicle_deadline
SET title = CASE deadline_type
    WHEN 'ASSICURAZIONE' THEN 'Assicurazione'
    WHEN 'BOLLO' THEN 'Bollo'
    WHEN 'REVISIONE' THEN 'Revisione'
    WHEN 'TAGLIANDO' THEN 'Tagliando'
    ELSE 'Scadenza'
END
WHERE title IS NULL;

UPDATE fleet_vehicle_deadline
SET cost_amount = 0.00
WHERE cost_amount IS NULL;

UPDATE fleet_vehicle_deadline
SET currency = 'EUR'
WHERE currency IS NULL OR TRIM(currency) = '';

UPDATE fleet_vehicle_deadline
SET payment_date = completed_at::date
WHERE completed_at IS NOT NULL
  AND payment_date IS NULL
  AND deadline_type IN ('ASSICURAZIONE', 'BOLLO');

UPDATE fleet_vehicle_deadline
SET execution_date = completed_at::date
WHERE completed_at IS NOT NULL
  AND execution_date IS NULL
  AND deadline_type IN ('REVISIONE', 'TAGLIANDO', 'ALTRO');

UPDATE fleet_vehicle_deadline
SET status = CASE
    WHEN completed_at IS NOT NULL AND deadline_type IN ('ASSICURAZIONE', 'BOLLO') THEN 'PAGATA'
    WHEN completed_at IS NOT NULL THEN 'ESEGUITA'
    WHEN due_date < CURRENT_DATE THEN 'SCADUTA'
    WHEN due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'IN_SCADENZA'
    ELSE 'DA_ESEGUIRE'
END
WHERE status IS NULL;

ALTER TABLE fleet_vehicle_deadline
    ALTER COLUMN title SET NOT NULL,
    ALTER COLUMN status SET NOT NULL,
    ALTER COLUMN cost_amount SET NOT NULL,
    ALTER COLUMN currency SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fleet_deadline_status_due ON fleet_vehicle_deadline (status, due_date);
CREATE INDEX IF NOT EXISTS idx_fleet_deadline_vehicle_status ON fleet_vehicle_deadline (vehicle_id, status);
