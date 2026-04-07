-- Seed records to test the EXECUTED -> CLOSED workflow alert in Services.
--
-- Goal:
-- - Create services in status EXECUTED
-- - Some older than 20 days (should trigger alert)
-- - Some more recent (should NOT trigger alert)
--
-- Idempotent: safe to run multiple times (uses unique marker in notes).

BEGIN;

-- Ensure there is at least one active partner for OUTSOURCED demo rows.
INSERT INTO partner (
    partner_type,
    ragione_sociale,
    nome_referente,
    cognome_referente,
    telefono,
    email,
    citta,
    indirizzo,
    zona_operativa,
    partita_iva,
    codice_fiscale,
    iban,
    intestatario_conto,
    note_pagamenti,
    riceve_email,
    riceve_whatsapp,
    telefono_whatsapp,
    note_operative,
    deleted,
    created_at,
    updated_at
)
SELECT
    'NCC',
    'Partner Alert Demo',
    'Giulia',
    'Neri',
    '+390200000001',
    'partner.alert.demo@rideops.local',
    'Milano',
    'Via Demo 1',
    'Lombardia',
    'IT00000000001',
    'NRIGLI90A01F205X',
    'IT60X0542811101000000123456',
    'Partner Alert Demo SRL',
    'Pagamento a 30 giorni',
    TRUE,
    FALSE,
    NULL,
    'Seed per test alert servizi EXECUTED',
    FALSE,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1
    FROM partner p
    WHERE p.ragione_sociale = 'Partner Alert Demo'
      AND p.deleted = FALSE
);

WITH actors AS (
    SELECT
        (SELECT id FROM app_user WHERE role = 'DRIVER' AND enabled = TRUE ORDER BY id LIMIT 1) AS driver_id,
        (SELECT id FROM app_user WHERE role IN ('ADMIN', 'GESTIONALE') AND enabled = TRUE ORDER BY id LIMIT 1) AS assigned_by_id,
        (SELECT id FROM fleet_vehicle ORDER BY id LIMIT 1) AS vehicle_id,
        (SELECT id FROM partner WHERE ragione_sociale = 'Partner Alert Demo' AND deleted = FALSE ORDER BY id DESC LIMIT 1) AS partner_id
), payload AS (
    SELECT *
    FROM (
        VALUES
            -- Older than 20 days -> should trigger alert
            ('SEED_EXECUTED_ALERT_001', NOW() - INTERVAL '35 days', NOW() - INTERVAL '26 days', 'Milano Centrale', 'Malpensa T1', 'TRANSFER', 2, 220.00::numeric, 'OUTSOURCED', 140.00::numeric, 80.00::numeric),
            ('SEED_EXECUTED_ALERT_002', NOW() - INTERVAL '32 days', NOW() - INTERVAL '24 days', 'Monza Centro', 'Linate', 'TRANSFER', 2, 185.00::numeric, 'INTERNAL', NULL::numeric, NULL::numeric),
            ('SEED_EXECUTED_ALERT_003', NOW() - INTERVAL '28 days', NOW() - INTERVAL '21 days', 'Bergamo Aeroporto', 'Milano CityLife', 'TRANSFER', 3, 290.00::numeric, 'OUTSOURCED', 170.00::numeric, 120.00::numeric),

            -- Newer than 20 days -> should NOT trigger alert
            ('SEED_EXECUTED_ALERT_004', NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days', 'Como Centro', 'Milano Duomo', 'TRANSFER', 2, 210.00::numeric, 'INTERNAL', NULL::numeric, NULL::numeric),
            ('SEED_EXECUTED_ALERT_005', NOW() - INTERVAL '6 days', NOW() - INTERVAL '5 days', 'Verona Porta Nuova', 'Brescia Stazione', 'TRANSFER', 2, 175.00::numeric, 'OUTSOURCED', 110.00::numeric, 65.00::numeric)
    ) AS t(
        note_marker,
        start_at,
        updated_at,
        pickup_location,
        destination,
        service_type,
        duration_hours,
        price,
        service_assignment_type,
        price_partner,
        margin
    )
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
    assigned_driver_id,
    assigned_vehicle_id,
    assigned_by_user_id,
    assigned_at,
    service_assignment_type,
    partner_id,
    price_partner,
    margin,
    created_at,
    updated_at
)
SELECT
    p.start_at,
    p.pickup_location,
    p.destination,
    p.service_type,
    p.duration_hours,
    p.note_marker,
    p.price,
    'EXECUTED',
    a.driver_id,
    a.vehicle_id,
    a.assigned_by_id,
    p.start_at - INTERVAL '1 day',
    p.service_assignment_type,
    CASE WHEN p.service_assignment_type = 'OUTSOURCED' THEN a.partner_id ELSE NULL END,
    p.price_partner,
    p.margin,
    p.start_at - INTERVAL '2 days',
    p.updated_at
FROM payload p
CROSS JOIN actors a
WHERE NOT EXISTS (
    SELECT 1
    FROM ride_service rs
    WHERE rs.notes = p.note_marker
);

COMMIT;

-- Quick verification query (optional):
-- SELECT id, status, updated_at, notes
-- FROM ride_service
-- WHERE notes LIKE 'SEED_EXECUTED_ALERT_%'
-- ORDER BY updated_at ASC;
