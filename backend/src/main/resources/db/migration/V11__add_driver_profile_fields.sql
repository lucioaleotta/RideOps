ALTER TABLE app_user
    ADD COLUMN IF NOT EXISTS first_name VARCHAR(80),
    ADD COLUMN IF NOT EXISTS last_name VARCHAR(80),
    ADD COLUMN IF NOT EXISTS birth_date DATE,
    ADD COLUMN IF NOT EXISTS license_number VARCHAR(80),
    ADD COLUMN IF NOT EXISTS license_types_json TEXT,
    ADD COLUMN IF NOT EXISTS residential_addresses_json TEXT,
    ADD COLUMN IF NOT EXISTS mobile_phone VARCHAR(40),
    ADD COLUMN IF NOT EXISTS license_expiry_date DATE;

CREATE INDEX IF NOT EXISTS idx_app_user_driver_name
    ON app_user (last_name, first_name);

CREATE INDEX IF NOT EXISTS idx_app_user_license_expiry
    ON app_user (license_expiry_date);
