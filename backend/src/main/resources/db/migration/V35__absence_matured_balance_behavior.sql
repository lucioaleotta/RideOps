ALTER TABLE configurazioni_assenza_tenant
    RENAME COLUMN scadenza_ferie_mesi TO scadenza_mesi_accumulo;

ALTER TABLE configurazioni_assenza_driver
    RENAME COLUMN scadenza_ferie_mesi TO scadenza_mesi_accumulo;

ALTER TABLE tipi_assenza
    RENAME COLUMN scadenza_ferie_mesi_default TO scadenza_mesi_accumulo_default;

UPDATE tipi_assenza
SET scadenza_mesi_accumulo_default = 18
WHERE codice IN ('FER', 'PER', 'RIP');

ALTER TABLE configurazioni_assenza_tenant
    ADD COLUMN comportamento_maturato VARCHAR(30) NOT NULL DEFAULT 'azzeramento_annuale';

ALTER TABLE configurazioni_assenza_driver
    ADD COLUMN comportamento_maturato VARCHAR(30) NOT NULL DEFAULT 'azzeramento_annuale';

UPDATE configurazioni_assenza_tenant config
SET comportamento_maturato = 'accumulo_esteso'
FROM tipi_assenza tipo
WHERE config.tipo_assenza_id = tipo.id
    AND tipo.codice = 'FER';

UPDATE configurazioni_assenza_driver config
SET comportamento_maturato = 'accumulo_esteso'
FROM tipi_assenza tipo
WHERE config.tipo_assenza_id = tipo.id
    AND tipo.codice = 'FER';

ALTER TABLE configurazioni_assenza_tenant
    ADD CONSTRAINT ck_config_assenza_comportamento_maturato
        CHECK (comportamento_maturato IN ('azzeramento_annuale', 'accumulo_esteso'));

ALTER TABLE configurazioni_assenza_driver
    ADD CONSTRAINT ck_config_driver_comportamento_maturato
        CHECK (comportamento_maturato IN ('azzeramento_annuale', 'accumulo_esteso'));