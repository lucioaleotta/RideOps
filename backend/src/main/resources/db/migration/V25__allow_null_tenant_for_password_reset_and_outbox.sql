-- Gli utenti ADMIN sono globali e possono avere tenant_id nullo.
-- Il flusso forgot-password deve funzionare anche per questi utenti.

ALTER TABLE password_reset_token
    ALTER COLUMN tenant_id DROP NOT NULL;

ALTER TABLE email_outbox
    ALTER COLUMN tenant_id DROP NOT NULL;