CREATE TABLE financial_transaction (
    id BIGSERIAL PRIMARY KEY,
    transaction_type VARCHAR(10) NOT NULL,
    category VARCHAR(40) NOT NULL,
    description VARCHAR(255) NOT NULL,
    amount NUMERIC(14, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    transaction_date DATE NOT NULL,
    service_id BIGINT NULL,
    vehicle_id BIGINT NULL,
    driver_id BIGINT NULL,
    deadline_occurrence_id BIGINT NULL,
    notes TEXT NULL,
    auto_created BOOLEAN NOT NULL DEFAULT FALSE,
    source_key VARCHAR(120) NULL,
    voided BOOLEAN NOT NULL DEFAULT FALSE,
    voided_at TIMESTAMP NULL,
    void_reason TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ux_financial_transaction_source_key
    ON financial_transaction (source_key)
    WHERE source_key IS NOT NULL;

CREATE INDEX ix_financial_transaction_date ON financial_transaction (transaction_date);
CREATE INDEX ix_financial_transaction_type_date ON financial_transaction (transaction_type, transaction_date);
CREATE INDEX ix_financial_transaction_category_date ON financial_transaction (category, transaction_date);
CREATE INDEX ix_financial_transaction_service ON financial_transaction (service_id);
CREATE INDEX ix_financial_transaction_vehicle ON financial_transaction (vehicle_id);
CREATE INDEX ix_financial_transaction_deadline_occurrence ON financial_transaction (deadline_occurrence_id);
CREATE INDEX ix_financial_transaction_voided_date ON financial_transaction (voided, transaction_date);
