CREATE TABLE IF NOT EXISTS partner_service_communication (
    id BIGSERIAL PRIMARY KEY,
    partner_id BIGINT NOT NULL REFERENCES partner(id),
    service_id BIGINT NOT NULL REFERENCES ride_service(id),
    channel VARCHAR(20) NOT NULL,
    recipient VARCHAR(190) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_partner_service_comm_partner_created_at
    ON partner_service_communication (partner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_partner_service_comm_service_channel
    ON partner_service_communication (service_id, channel);
