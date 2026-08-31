-- =============================================================================
-- anonymize_local.sql — Anonimizzazione dati per ambiente di sviluppo locale
--
-- DA ESEGUIRE SOLO SUL DB LOCALE. Mai in produzione.
--
-- Uso diretto (tramite db:pull-prod):
--   Viene invocato automaticamente da ./scripts/rideops.sh db:pull-prod
--
-- Uso manuale (se sai quello che fai):
--   HASH=$(docker exec rideops-postgres psql -U rideops -d rideops -tAc \
--     "CREATE EXTENSION IF NOT EXISTS pgcrypto; SELECT crypt('Password123!', gen_salt('bf', 10));")
--   docker exec -i rideops-postgres psql -U rideops -d rideops \
--     -v dev_password_hash="${HASH}" -f anonymize_local.sql
--
-- Cosa fa:
--   1. Sostituisce tutti gli hash password con BCrypt di "Password123!"
--   2. Anonimizza email, telefoni, dati anagrafici in app_user
--   3. Anonimizza email/telefoni in tenant e partner
--   4. Svuota i campi cliente in ride_service
--   5. Trunca user_sessions, email_outbox, password_reset_token, audit_log
-- =============================================================================

BEGIN;

-- Salvaguardia: impedisce l'esecuzione accidentale su prod
-- (prod ha sempre application_name impostato dal backend Spring)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_stat_activity
    WHERE datname = current_database()
      AND application_name ILIKE '%rideops-backend%'
      AND pid <> pg_backend_pid()
    HAVING COUNT(*) > 2
  ) THEN
    RAISE EXCEPTION
      'Rilevate più di 2 connessioni backend attive: questo sembra un DB di produzione. Uscita per sicurezza.';
  END IF;
END $$;

-- ── 1. app_user ─────────────────────────────────────────────────────────────
-- password_hash: viene passato come variabile psql :'dev_password_hash'
-- email: <user_id>@dev.local (unica, non-PII)
UPDATE app_user
SET
  password_hash              = :'dev_password_hash',
  email                      = user_id || '@dev.local',
  mobile_phone               = NULL,
  birth_date                 = NULL,
  license_number             = CASE WHEN license_number IS NOT NULL
                                 THEN 'DEV-' || UPPER(user_id)
                                 ELSE NULL END,
  residential_addresses_json = '[]';

-- ── 2. tenant ───────────────────────────────────────────────────────────────
-- business_name lasciato per identificare i tenant nel pannello admin
UPDATE tenant
SET
  contact_email  = 'tenant' || id || '@dev.local',
  pec_email      = 'pec' || id || '@dev.local',
  contact_phone  = NULL,
  contact_person = NULL;

-- ── 3. partner ──────────────────────────────────────────────────────────────
-- ragione_sociale lasciata per identificazione
UPDATE partner
SET email = 'partner' || id || '@dev.local'
WHERE email IS NOT NULL;

-- ── 4. ride_service: dati cliente ───────────────────────────────────────────
UPDATE ride_service
SET
  client_name  = CASE WHEN client_name IS NOT NULL THEN 'Cliente Dev' ELSE NULL END,
  client_phone = NULL,
  client_email = NULL;

-- ── 5. Dati operativi non necessari in locale ────────────────────────────────
-- IP reali, geo-data, sessioni prod
TRUNCATE TABLE user_sessions;

-- Coda email prod (non vogliamo consegne accidentali)
TRUNCATE TABLE email_outbox;

-- Token di reset password (invalidi fuori prod)
TRUNCATE TABLE password_reset_token;

-- Audit log admin (contiene azioni reali degli amministratori)
TRUNCATE TABLE user_admin_audit_log;

COMMIT;

\echo ''
\echo '============================================================'
\echo ' Anonimizzazione completata.'
\echo ' Password per TUTTE le utenze: Password123!'
\echo '============================================================'
