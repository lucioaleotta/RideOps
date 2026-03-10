ALTER TABLE ride_service
    ADD COLUMN IF NOT EXISTS assigned_driver_id BIGINT,
    ADD COLUMN IF NOT EXISTS assigned_by_user_id BIGINT,
    ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_ride_service_assigned_driver'
    ) THEN
        ALTER TABLE ride_service
            ADD CONSTRAINT fk_ride_service_assigned_driver
            FOREIGN KEY (assigned_driver_id) REFERENCES app_user(id);
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_ride_service_assigned_by_user'
    ) THEN
        ALTER TABLE ride_service
            ADD CONSTRAINT fk_ride_service_assigned_by_user
            FOREIGN KEY (assigned_by_user_id) REFERENCES app_user(id);
    END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_ride_service_assigned_driver ON ride_service (assigned_driver_id);
CREATE INDEX IF NOT EXISTS idx_ride_service_assigned_at ON ride_service (assigned_at);