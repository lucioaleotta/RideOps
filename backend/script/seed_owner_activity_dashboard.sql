-- Seed mirato per Owner Activity Dashboard
-- Idempotente: aggiorna/inserisce senza duplicare dati a ogni esecuzione.

BEGIN;

-- 1) Tenants demo con piani diversi
INSERT INTO tenant (
    business_name,
    contact_email,
    timezone,
    currency,
    language,
    notify_email_enabled,
    notify_sms_enabled,
    notify_push_enabled,
    status,
    subscription_status,
    subscription_plan,
    created_at
)
VALUES
    ('CityRide Milano', 'ops+cityride@rideops.local', 'Europe/Rome', 'EUR', 'it', TRUE, FALSE, TRUE, 'ACTIVE', 'ACTIVE', 'PRO', NOW()),
    ('NordRide Torino', 'ops+nordride@rideops.local', 'Europe/Rome', 'EUR', 'it', TRUE, FALSE, TRUE, 'ACTIVE', 'ACTIVE', 'STARTER', NOW()),
    ('Rossi Trasporti', 'ops+rossi@rideops.local', 'Europe/Rome', 'EUR', 'it', TRUE, FALSE, TRUE, 'ACTIVE', 'ACTIVE', 'PRO', NOW()),
    ('MobilityHub', 'ops+mobilityhub@rideops.local', 'Europe/Rome', 'EUR', 'it', TRUE, FALSE, TRUE, 'ACTIVE', 'ACTIVE', 'ENTERPRISE', NOW()),
    ('VeloCity Roma', 'ops+velocity@rideops.local', 'Europe/Rome', 'EUR', 'it', TRUE, FALSE, TRUE, 'ACTIVE', 'ACTIVE', 'STARTER', NOW()),
    ('Lux Transfer Milano Srl', 'ops+lux@rideops.local', 'Europe/Rome', 'EUR', 'it', TRUE, FALSE, TRUE, 'ACTIVE', 'ACTIVE', 'PRO', NOW())
ON CONFLICT (business_name) DO UPDATE
SET
    contact_email = EXCLUDED.contact_email,
    subscription_plan = EXCLUDED.subscription_plan,
    subscription_status = EXCLUDED.subscription_status,
    status = EXCLUDED.status;

-- 2) Utenti tenant per popolare user_sessions
WITH seed_pw AS (
    SELECT COALESCE(
        (SELECT password_hash FROM app_user WHERE user_id = 'admin' LIMIT 1),
        '$2a$10$7EqJtq98hPqEX7fNZaFWoOHi6M6Q0Q8n7YVOlJawVSxGJySLjeRG.'
    ) AS pwd
), wanted_users AS (
    SELECT *
    FROM (VALUES
        ('owner_cityride', 'owner.cityride@rideops.local', 'CityRide Milano', 'Mario', 'Rossi', 'ADMIN'),
        ('owner_nordride', 'owner.nordride@rideops.local', 'NordRide Torino', 'Luca', 'Bianchi', 'ADMIN'),
        ('owner_rossi', 'owner.rossi@rideops.local', 'Rossi Trasporti', 'Giulia', 'Verdi', 'ADMIN'),
        ('owner_mobility', 'owner.mobility@rideops.local', 'MobilityHub', 'Anna', 'Neri', 'ADMIN'),
        ('owner_velocity', 'owner.velocity@rideops.local', 'VeloCity Roma', 'Paolo', 'Gialli', 'ADMIN'),
        ('owner_lux', 'owner.lux@rideops.local', 'Lux Transfer Milano Srl', 'Sara', 'Blu', 'ADMIN')
    ) AS t(user_id, email, business_name, first_name, last_name, role)
)
INSERT INTO app_user (
    email,
    user_id,
    password_hash,
    role,
    enabled,
    first_name,
    last_name,
    tenant_id,
    created_at
)
SELECT
    wu.email,
    wu.user_id,
    sp.pwd,
    wu.role,
    TRUE,
    wu.first_name,
    wu.last_name,
    t.id,
    NOW()
FROM wanted_users wu
JOIN tenant t ON t.business_name = wu.business_name
CROSS JOIN seed_pw sp
ON CONFLICT (email) DO UPDATE
SET
    role = EXCLUDED.role,
    enabled = EXCLUDED.enabled,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    tenant_id = EXCLUDED.tenant_id;

-- 3) Servizi ultimi 12 mesi con distribuzione differenziata per tenant
WITH months AS (
    SELECT generate_series(0, 11) AS m
), tenant_weights AS (
    SELECT t.id AS tenant_id,
           t.business_name,
           CASE t.business_name
               WHEN 'CityRide Milano' THEN 16
               WHEN 'NordRide Torino' THEN 10
               WHEN 'Rossi Trasporti' THEN 8
               WHEN 'MobilityHub' THEN 6
               WHEN 'VeloCity Roma' THEN 4
               WHEN 'Lux Transfer Milano Srl' THEN 2
               ELSE 1
           END AS base_count
    FROM tenant t
    WHERE t.business_name IN (
        'CityRide Milano',
        'NordRide Torino',
        'Rossi Trasporti',
        'MobilityHub',
        'VeloCity Roma',
        'Lux Transfer Milano Srl'
    )
), expanded AS (
    SELECT
        tw.tenant_id,
        tw.business_name,
        mo.m,
        gs.n,
        (date_trunc('month', NOW()) - (mo.m || ' months')::interval + (gs.n || ' days')::interval + time '08:00') AS start_at
    FROM tenant_weights tw
    CROSS JOIN months mo
    CROSS JOIN LATERAL generate_series(1, tw.base_count) AS gs(n)
)
INSERT INTO ride_service (
    start_at,
    pickup_location,
    destination,
    service_type,
    duration_hours,
    notes,
    price,
    status,
    service_assignment_type,
    tenant_id,
    created_at,
    updated_at
)
SELECT
    e.start_at,
    'Milano Centrale',
    CASE
        WHEN e.n % 3 = 0 THEN 'Aeroporto'
        WHEN e.n % 3 = 1 THEN 'Centro Citta'
        ELSE 'Business District'
    END,
    CASE WHEN e.n % 4 = 0 THEN 'TOUR' ELSE 'TRANSFER' END,
    1 + (e.n % 4),
    'OWNER_ACTIVITY_SEED|' || e.business_name || '|' || to_char(e.start_at, 'YYYYMM') || '|' || e.n,
    (80 + (e.n * 7))::numeric(12,2),
    CASE WHEN e.n % 9 = 0 THEN 'OPEN' WHEN e.n % 5 = 0 THEN 'ASSIGNED' ELSE 'CLOSED' END,
    'INTERNAL',
    e.tenant_id,
    e.start_at - interval '2 days',
    NOW()
FROM expanded e
WHERE NOT EXISTS (
    SELECT 1
    FROM ride_service rs
    WHERE rs.notes = 'OWNER_ACTIVITY_SEED|' || e.business_name || '|' || to_char(e.start_at, 'YYYYMM') || '|' || e.n
);

-- 4) Sessioni utente ultimi 12 mesi per top5 e avg_logins_per_week
WITH months AS (
    SELECT generate_series(0, 11) AS m
), sessions_cfg AS (
    SELECT
        u.id AS user_id,
        u.tenant_id,
        t.business_name,
        CASE t.business_name
            WHEN 'CityRide Milano' THEN 38
            WHEN 'NordRide Torino' THEN 26
            WHEN 'Rossi Trasporti' THEN 20
            WHEN 'MobilityHub' THEN 17
            WHEN 'VeloCity Roma' THEN 12
            WHEN 'Lux Transfer Milano Srl' THEN 8
            ELSE 4
        END AS sess_count
    FROM app_user u
    JOIN tenant t ON t.id = u.tenant_id
    WHERE u.user_id IN (
        'owner_cityride',
        'owner_nordride',
        'owner_rossi',
        'owner_mobility',
        'owner_velocity',
        'owner_lux'
    )
), expanded AS (
    SELECT
        sc.user_id,
        sc.tenant_id,
        sc.business_name,
        mo.m,
        gs.n,
        (date_trunc('month', NOW()) - (mo.m || ' months')::interval + (gs.n || ' hours')::interval) AS created_at
    FROM sessions_cfg sc
    CROSS JOIN months mo
    CROSS JOIN LATERAL generate_series(1, sc.sess_count) AS gs(n)
)
INSERT INTO user_sessions (
    user_id,
    tenant_id,
    created_at,
    ip_address,
    user_agent,
    device_type,
    anomaly,
    country_code,
    country_name,
    city,
    user_agent_raw,
    ua_browser,
    ua_os
)
SELECT
    e.user_id,
    e.tenant_id,
    e.created_at,
    ('10.20.' || (e.tenant_id % 255)::text || '.' || ((e.n % 200) + 10)::text)::inet,
    'Mozilla/5.0',
    CASE WHEN e.n % 4 = 0 THEN 'mobile' WHEN e.n % 7 = 0 THEN 'tablet' ELSE 'desktop' END,
    CASE WHEN e.n % 29 = 0 THEN 'orario insolito' WHEN e.n % 37 = 0 THEN 'paese insolito' ELSE NULL END,
    CASE WHEN e.n % 31 = 0 THEN 'DE' ELSE 'IT' END,
    CASE WHEN e.n % 31 = 0 THEN 'Germany' ELSE 'Italy' END,
    CASE WHEN e.n % 2 = 0 THEN 'Milano' ELSE 'Roma' END,
    'Mozilla/5.0 (X11; Linux x86_64)',
    CASE WHEN e.n % 5 = 0 THEN 'Firefox' ELSE 'Chrome' END,
    'Linux'
FROM expanded e
WHERE NOT EXISTS (
    SELECT 1
    FROM user_sessions us
    WHERE us.user_id = e.user_id
      AND us.tenant_id = e.tenant_id
      AND us.created_at = e.created_at
      AND us.user_agent_raw = 'Mozilla/5.0 (X11; Linux x86_64)'
);

COMMIT;
