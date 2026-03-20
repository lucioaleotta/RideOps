CREATE TABLE IF NOT EXISTS partner (
    id BIGSERIAL PRIMARY KEY,
    partner_type VARCHAR(20) NOT NULL,
    ragione_sociale VARCHAR(180) NOT NULL,
    nome_referente VARCHAR(120),
    cognome_referente VARCHAR(120),
    telefono VARCHAR(40),
    email VARCHAR(180),
    citta VARCHAR(120),
    indirizzo VARCHAR(240),
    zona_operativa VARCHAR(160),
    partita_iva VARCHAR(32),
    codice_fiscale VARCHAR(32),
    iban VARCHAR(64),
    intestatario_conto VARCHAR(180),
    note_pagamenti TEXT,
    riceve_email BOOLEAN NOT NULL DEFAULT TRUE,
    riceve_whatsapp BOOLEAN NOT NULL DEFAULT FALSE,
    telefono_whatsapp VARCHAR(40),
    note_operative TEXT,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_partner_type_deleted ON partner (partner_type, deleted);
CREATE INDEX IF NOT EXISTS idx_partner_ragione_sociale ON partner (ragione_sociale);
