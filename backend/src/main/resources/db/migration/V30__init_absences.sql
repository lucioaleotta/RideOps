CREATE TABLE IF NOT EXISTS tipi_assenza (
    id BIGSERIAL PRIMARY KEY,
    codice VARCHAR(10) NOT NULL UNIQUE,
    nome VARCHAR(100) NOT NULL,
    unita_misura VARCHAR(10) NOT NULL,
    origine_driver_consentita BOOLEAN NOT NULL DEFAULT TRUE,
    origine_gestionale_consentita BOOLEAN NOT NULL DEFAULT TRUE,
    richiede_orario BOOLEAN NOT NULL DEFAULT FALSE,
    richiede_documento_default BOOLEAN NOT NULL DEFAULT FALSE,
    scala_da_monte_ore_default BOOLEAN NOT NULL DEFAULT FALSE,
    preavviso_minimo_giorni_default INTEGER NOT NULL DEFAULT 0,
    attivo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS richieste_assenza (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenant(id),
    driver_id BIGINT NOT NULL REFERENCES app_user(id),
    tipo_assenza_id BIGINT NOT NULL REFERENCES tipi_assenza(id),
    origine VARCHAR(20) NOT NULL,
    data_inizio DATE NOT NULL,
    data_fine DATE NOT NULL,
    giornata_intera BOOLEAN NOT NULL DEFAULT TRUE,
    ora_inizio TIME NULL,
    ora_fine TIME NULL,
    stato VARCHAR(20) NOT NULL,
    richiede_approvazione_eccezionale BOOLEAN NOT NULL DEFAULT FALSE,
    motivazione TEXT NULL,
    motivo_rifiuto TEXT NULL,
    documento_allegato_url VARCHAR(500) NULL,
    approvata_da BIGINT NULL REFERENCES app_user(id),
    data_decisione TIMESTAMP NULL,
    creato_il TIMESTAMP NOT NULL,
    aggiornato_il TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_richieste_assenza_tenant ON richieste_assenza (tenant_id);
CREATE INDEX IF NOT EXISTS idx_richieste_assenza_driver ON richieste_assenza (driver_id);
CREATE INDEX IF NOT EXISTS idx_richieste_assenza_stato ON richieste_assenza (stato);

INSERT INTO tipi_assenza (codice, nome, unita_misura, origine_driver_consentita, origine_gestionale_consentita,
                          richiede_orario, richiede_documento_default, scala_da_monte_ore_default,
                          preavviso_minimo_giorni_default, attivo)
VALUES
    ('FER', 'Ferie', 'GIORNI', TRUE, TRUE, FALSE, FALSE, TRUE, 3, TRUE),
    ('MAL', 'Malattia', 'GIORNI', TRUE, TRUE, FALSE, FALSE, FALSE, 0, TRUE),
    ('PER', 'Permesso', 'ORE', TRUE, TRUE, TRUE, FALSE, TRUE, 1, TRUE),
    ('RIP', 'Riposo', 'GIORNI', TRUE, TRUE, FALSE, FALSE, TRUE, 1, TRUE),
    ('CON', 'Congedo', 'GIORNI', TRUE, TRUE, FALSE, FALSE, FALSE, 0, TRUE),
    ('SGA', 'Sganciamento', 'GIORNI', FALSE, TRUE, FALSE, FALSE, FALSE, 0, TRUE)
ON CONFLICT (codice) DO NOTHING;
