CREATE TABLE saldi_driver (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    driver_id BIGINT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    tipo_assenza_id BIGINT NOT NULL REFERENCES tipi_assenza(id),
    anno_maturazione INTEGER NOT NULL,
    quantita_maturata NUMERIC(10, 2) NOT NULL,
    quantita_utilizzata NUMERIC(10, 2) NOT NULL DEFAULT 0,
    aggiornato_il TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    aggiornato_da BIGINT REFERENCES app_user(id),
    CONSTRAINT uq_saldi_driver_tipo_anno UNIQUE (tenant_id, driver_id, tipo_assenza_id, anno_maturazione),
    CONSTRAINT ck_saldi_maturata_non_negativa CHECK (quantita_maturata >= 0),
    CONSTRAINT ck_saldi_utilizzata_non_negativa CHECK (quantita_utilizzata >= 0),
    CONSTRAINT ck_saldi_utilizzata_non_superiore CHECK (quantita_utilizzata <= quantita_maturata)
);

CREATE INDEX idx_saldi_driver_lookup ON saldi_driver (tenant_id, driver_id, tipo_assenza_id, anno_maturazione);

CREATE TABLE consumi_saldo_assenza (
    id BIGSERIAL PRIMARY KEY,
    richiesta_assenza_id BIGINT NOT NULL REFERENCES richieste_assenza(id) ON DELETE CASCADE,
    saldo_driver_id BIGINT NOT NULL REFERENCES saldi_driver(id),
    quantita NUMERIC(10, 2) NOT NULL,
    stornato BOOLEAN NOT NULL DEFAULT FALSE,
    creato_il TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_consumo_quantita_positiva CHECK (quantita > 0)
);

CREATE INDEX idx_consumi_saldo_richiesta ON consumi_saldo_assenza (richiesta_assenza_id, stornato);