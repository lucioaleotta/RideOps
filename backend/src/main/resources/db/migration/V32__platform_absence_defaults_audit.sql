ALTER TABLE tipi_assenza
    ADD COLUMN numero_giorni_annui_default NUMERIC(8, 2),
    ADD COLUMN numero_giorni_malattia_annui_default NUMERIC(8, 2),
    ADD COLUMN scadenza_ferie_mesi_default INTEGER;

UPDATE tipi_assenza
SET numero_giorni_annui_default = CASE codice
        WHEN 'FER' THEN 26
        WHEN 'PER' THEN 32
        WHEN 'CON' THEN 3
        ELSE NULL
    END,
    numero_giorni_malattia_annui_default = CASE codice WHEN 'MAL' THEN 300 ELSE NULL END,
    scadenza_ferie_mesi_default = CASE codice WHEN 'FER' THEN 18 ELSE NULL END;

CREATE TABLE audit_tipi_assenza_default (
    id BIGSERIAL PRIMARY KEY,
    admin_user_id BIGINT NOT NULL REFERENCES app_user(id),
    admin_userid VARCHAR(80) NOT NULL,
    tipo_assenza_id BIGINT NOT NULL REFERENCES tipi_assenza(id),
    codice VARCHAR(10) NOT NULL,
    azione VARCHAR(20) NOT NULL,
    valori_precedenti TEXT,
    valori_nuovi TEXT NOT NULL,
    creato_il TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_tipi_assenza_creato ON audit_tipi_assenza_default (creato_il DESC);