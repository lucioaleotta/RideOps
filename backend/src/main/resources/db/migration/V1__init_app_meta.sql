-- Flyway crea automaticamente la tabella standard flyway_schema_history.
-- Questa migration verifica il wiring Flyway creando una tabella applicativa minima.

CREATE TABLE IF NOT EXISTS app_meta (
    schema_version VARCHAR(50) PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO app_meta (schema_version)
VALUES ('V1')
ON CONFLICT (schema_version) DO NOTHING;
