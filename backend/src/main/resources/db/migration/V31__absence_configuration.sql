CREATE TABLE configurazioni_assenza_tenant (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    tipo_assenza_id BIGINT NOT NULL REFERENCES tipi_assenza(id),
    abilitato BOOLEAN NOT NULL,
    richiede_documento BOOLEAN NOT NULL,
    monte_ore_abilitato BOOLEAN NOT NULL,
    numero_giorni_annui NUMERIC(8, 2),
    numero_giorni_malattia_annui NUMERIC(8, 2),
    scadenza_ferie_mesi INTEGER,
    preavviso_minimo_giorni INTEGER NOT NULL,
    note_configurazione TEXT,
    aggiornato_il TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    aggiornato_da BIGINT REFERENCES app_user(id),
    CONSTRAINT uq_config_assenza_tenant_tipo UNIQUE (tenant_id, tipo_assenza_id),
    CONSTRAINT ck_config_assenza_preavviso_non_negativo CHECK (preavviso_minimo_giorni >= 0)
);

CREATE INDEX idx_config_assenza_tenant ON configurazioni_assenza_tenant (tenant_id, tipo_assenza_id);

CREATE TABLE regole_generali_assenza_tenant (
    tenant_id BIGINT PRIMARY KEY REFERENCES tenant(id) ON DELETE CASCADE,
    comportamento_conflitto_turni VARCHAR(30) NOT NULL DEFAULT 'SEGNALA',
    aggiornato_il TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    aggiornato_da BIGINT REFERENCES app_user(id),
    CONSTRAINT ck_regola_conflitto_turni CHECK (comportamento_conflitto_turni IN ('SEGNALA', 'SEGNALA_E_BLOCCA'))
);

CREATE TABLE configurazioni_assenza_driver (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    driver_id BIGINT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    tipo_assenza_id BIGINT NOT NULL REFERENCES tipi_assenza(id),
    abilitato BOOLEAN NOT NULL,
    richiede_documento BOOLEAN NOT NULL,
    monte_ore_abilitato BOOLEAN NOT NULL,
    numero_giorni_annui NUMERIC(8, 2),
    numero_giorni_malattia_annui NUMERIC(8, 2),
    scadenza_ferie_mesi INTEGER,
    preavviso_minimo_giorni INTEGER NOT NULL,
    motivo TEXT,
    creato_da BIGINT REFERENCES app_user(id),
    creato_il TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    aggiornato_il TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_config_assenza_driver_tipo UNIQUE (driver_id, tipo_assenza_id),
    CONSTRAINT ck_config_driver_preavviso_non_negativo CHECK (preavviso_minimo_giorni >= 0)
);

CREATE INDEX idx_config_assenza_driver_tenant ON configurazioni_assenza_driver (tenant_id, tipo_assenza_id, driver_id);
