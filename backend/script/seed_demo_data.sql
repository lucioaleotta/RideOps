-- Seed demo RideOps data for Services, Fleet, Drivers and Finance pages.
-- Idempotent by design: can be executed multiple times without duplicating records.

BEGIN;

WITH seed_pw AS (
    SELECT COALESCE(
        (SELECT password_hash FROM app_user WHERE user_id = 'admin' LIMIT 1),
        '$2a$10$7EqJtq98hPqEX7fNZaFWoOHi6M6Q0Q8n7YVOlJawVSxGJySLjeRG.'
    ) AS pwd
)
INSERT INTO app_user (
    email,
    user_id,
    password_hash,
    role,
    enabled,
    first_name,
    last_name,
    birth_date,
    license_number,
    license_types_json,
    residential_addresses_json,
    mobile_phone,
    license_expiry_date,
    created_at
)
SELECT
    v.email,
    v.user_id,
    seed_pw.pwd,
    v.role,
    TRUE,
    v.first_name,
    v.last_name,
    v.birth_date,
    v.license_number,
    v.license_types_json,
    v.residential_addresses_json,
    v.mobile_phone,
    v.license_expiry_date,
    NOW()
FROM seed_pw
CROSS JOIN (
    VALUES
        ('gestore.finance@rideops.local', 'gestore_finance', 'GESTIONALE', 'Marco', 'Berti', DATE '1988-02-11', NULL, NULL, NULL, '+393401112233', NULL),
        ('driver.luca@rideops.local', 'driver_luca', 'DRIVER', 'Luca', 'Rinaldi', DATE '1991-06-15', 'LIC-LUCA-991', '["B","C"]', '["Via Roma 10, Milano"]', '+393331112211', DATE '2027-09-30'),
        ('driver.sofia@rideops.local', 'driver_sofia', 'DRIVER', 'Sofia', 'Conti', DATE '1994-03-22', 'LIC-SOFIA-882', '["B"]', '["Via Torino 25, Monza"]', '+393339887766', DATE '2026-12-31'),
        ('driver.andrea@rideops.local', 'driver_andrea', 'DRIVER', 'Andrea', 'Ferri', DATE '1987-11-03', 'LIC-ANDREA-447', '["B","D"]', '["Via Verdi 4, Bergamo"]', '+393347778899', DATE '2028-04-15')
) AS v(email, user_id, role, first_name, last_name, birth_date, license_number, license_types_json, residential_addresses_json, mobile_phone, license_expiry_date)
ON CONFLICT (email) DO UPDATE SET
    role = EXCLUDED.role,
    enabled = EXCLUDED.enabled,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    birth_date = EXCLUDED.birth_date,
    license_number = EXCLUDED.license_number,
    license_types_json = EXCLUDED.license_types_json,
    residential_addresses_json = EXCLUDED.residential_addresses_json,
    mobile_phone = EXCLUDED.mobile_phone,
    license_expiry_date = EXCLUDED.license_expiry_date;

INSERT INTO fleet_vehicle (plate, seats, vehicle_type, notes, created_at, updated_at)
VALUES
    ('RO-TR-001', 4, 'SEDAN', 'Seed demo sedan executive', NOW(), NOW()),
    ('RO-VN-010', 8, 'VAN', 'Seed demo van aeroporti', NOW(), NOW()),
    ('RO-MB-021', 16, 'MINIBUS', 'Seed demo minibus tour', NOW(), NOW()),
    ('RO-SV-105', 5, 'SUV', 'Seed demo suv premium', NOW(), NOW())
ON CONFLICT (plate) DO UPDATE SET
    seats = EXCLUDED.seats,
    vehicle_type = EXCLUDED.vehicle_type,
    notes = EXCLUDED.notes,
    updated_at = NOW();

INSERT INTO fleet_vehicle_deadline_plan (
    vehicle_id,
    deadline_type,
    title,
    description,
    recurrence_months,
    next_due_date,
    standard_cost_amount,
    currency,
    active,
    notes,
    created_at,
    updated_at
)
SELECT
    v.id,
    p.deadline_type,
    p.title,
    p.description,
    p.recurrence_months,
    p.next_due_date,
    p.standard_cost_amount,
    'EUR',
    TRUE,
    'SEED_DEMO_PLAN',
    NOW(),
    NOW()
FROM fleet_vehicle v
JOIN (
    VALUES
        ('RO-TR-001', 'ASSICURAZIONE', 'Assicurazione annuale', 'Polizza RCA annuale', 12, DATE '2026-09-15', 1180.00),
        ('RO-TR-001', 'TAGLIANDO', 'Tagliando periodico', 'Controllo ordinario ogni 6 mesi', 6, DATE '2026-05-20', 340.00),
        ('RO-VN-010', 'BOLLO', 'Bollo annuale', 'Bollo veicolo commerciale', 12, DATE '2026-03-31', 430.00),
        ('RO-VN-010', 'REVISIONE', 'Revisione ministeriale', 'Revisione annuale furgone', 12, DATE '2026-11-10', 120.00),
        ('RO-MB-021', 'TAGLIANDO', 'Tagliando minibus', 'Manutenzione minibus', 6, DATE '2026-04-12', 520.00),
        ('RO-SV-105', 'ASSICURAZIONE', 'Assicurazione premium', 'RCA + kasko', 12, DATE '2026-07-01', 1520.00)
) AS p(plate, deadline_type, title, description, recurrence_months, next_due_date, standard_cost_amount)
    ON p.plate = v.plate
WHERE NOT EXISTS (
    SELECT 1
    FROM fleet_vehicle_deadline_plan fp
    WHERE fp.vehicle_id = v.id
      AND fp.title = p.title
      AND fp.notes = 'SEED_DEMO_PLAN'
);

INSERT INTO fleet_vehicle_deadline_occurrence (
    vehicle_id,
    plan_id,
    deadline_type,
    title,
    description,
    due_date,
    status,
    cost_amount,
    currency,
    notes,
    payment_date,
    execution_date,
    created_at,
    updated_at
)
SELECT
    v.id,
    fp.id,
    o.deadline_type,
    o.plan_title,
    fp.description,
    o.due_date,
    o.status,
    o.cost_amount,
    'EUR',
    o.notes,
    o.payment_date,
    o.execution_date,
    NOW(),
    NOW()
FROM fleet_vehicle v
JOIN (
    VALUES
        ('RO-TR-001', 'Assicurazione annuale', 'ASSICURAZIONE', DATE '2025-09-15', 'PAGATA', 1120.00, 'SEED_DEMO_OCC_2025_A', DATE '2025-09-10', NULL),
        ('RO-TR-001', 'Tagliando periodico', 'TAGLIANDO', DATE '2025-11-20', 'ESEGUITA', 325.00, 'SEED_DEMO_OCC_2025_B', NULL, DATE '2025-11-18'),
        ('RO-VN-010', 'Bollo annuale', 'BOLLO', DATE '2025-03-31', 'PAGATA', 410.00, 'SEED_DEMO_OCC_2025_C', DATE '2025-03-27', NULL),
        ('RO-VN-010', 'Revisione ministeriale', 'REVISIONE', DATE '2026-01-10', 'ESEGUITA', 118.00, 'SEED_DEMO_OCC_2026_A', NULL, DATE '2026-01-08'),
        ('RO-MB-021', 'Tagliando minibus', 'TAGLIANDO', DATE '2026-04-12', 'IN_SCADENZA', 520.00, 'SEED_DEMO_OCC_2026_B', NULL, NULL),
        ('RO-SV-105', 'Assicurazione premium', 'ASSICURAZIONE', DATE '2026-07-01', 'DA_ESEGUIRE', 1520.00, 'SEED_DEMO_OCC_2026_C', NULL, NULL)
) AS o(plate, plan_title, deadline_type, due_date, status, cost_amount, notes, payment_date, execution_date)
    ON o.plate = v.plate
LEFT JOIN fleet_vehicle_deadline_plan fp
    ON fp.vehicle_id = v.id
   AND fp.title = o.plan_title
   AND fp.notes = 'SEED_DEMO_PLAN'
WHERE NOT EXISTS (
    SELECT 1
    FROM fleet_vehicle_deadline_occurrence occ
    WHERE occ.vehicle_id = v.id
      AND occ.title = o.plan_title
      AND occ.due_date = o.due_date
      AND occ.notes = o.notes
);

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
    created_at,
    updated_at
)
SELECT
    s.start_at,
    s.pickup_location,
    s.destination,
    s.service_type,
    s.duration_hours,
    s.notes,
    s.price,
    s.status,
    d.id,
    v.id,
    a.id,
    s.assigned_at,
    NOW(),
    NOW()
FROM (
    VALUES
        (TIMESTAMP '2025-01-15 07:30:00', 'Milano Centrale', 'Malpensa T1', 'TRANSFER', 2, 'SEED_DEMO_SVC_2025_01', 180.00, 'CLOSED', TIMESTAMP '2025-01-12 09:00:00', 'driver_luca', 'RO-TR-001'),
        (TIMESTAMP '2025-03-10 09:00:00', 'Bergamo Aeroporto', 'Milano Fiera', 'TRANSFER', 3, 'SEED_DEMO_SVC_2025_02', 260.00, 'CLOSED', TIMESTAMP '2025-03-07 10:30:00', 'driver_sofia', 'RO-VN-010'),
        (TIMESTAMP '2025-06-21 10:00:00', 'Como Centro', 'Lago di Garda Tour', 'TOUR', 8, 'SEED_DEMO_SVC_2025_03', 980.00, 'CLOSED', TIMESTAMP '2025-06-15 08:45:00', 'driver_andrea', 'RO-MB-021'),
        (TIMESTAMP '2025-10-05 14:30:00', 'Milano Duomo', 'Outlet Serravalle', 'TOUR', 6, 'SEED_DEMO_SVC_2025_04', 620.00, 'CLOSED', TIMESTAMP '2025-10-01 16:00:00', 'driver_luca', 'RO-SV-105'),
        (TIMESTAMP '2026-01-18 06:45:00', 'Milano Centrale', 'Linate', 'TRANSFER', 1, 'SEED_DEMO_SVC_2026_01', 130.00, 'CLOSED', TIMESTAMP '2026-01-15 12:00:00', 'driver_sofia', 'RO-TR-001'),
        (TIMESTAMP '2026-02-20 11:00:00', 'Monza', 'Fiera Rho', 'TRANSFER', 2, 'SEED_DEMO_SVC_2026_02', 210.00, 'ASSIGNED', TIMESTAMP '2026-02-18 10:20:00', 'driver_andrea', 'RO-VN-010'),
        (TIMESTAMP '2026-03-10 09:15:00', 'Milano Centrale', 'Como Centro', 'TRANSFER', 2, 'SEED_DEMO_SVC_2026_05', 280.00, 'CLOSED', TIMESTAMP '2026-03-06 10:00:00', 'driver_luca', 'RO-SV-105'),
        (TIMESTAMP '2026-04-10 08:30:00', 'Milano Stazione Garibaldi', 'Torino Porta Nuova', 'TRANSFER', 3, 'SEED_DEMO_SVC_2026_03', 340.00, 'ASSIGNED', TIMESTAMP '2026-04-02 09:00:00', 'driver_luca', 'RO-SV-105'),
        (TIMESTAMP '2026-05-12 09:00:00', 'Verona Centro', 'Lago di Como Tour', 'TOUR', 9, 'SEED_DEMO_SVC_2026_04', 1240.00, 'OPEN', NULL, NULL, NULL)
) AS s(start_at, pickup_location, destination, service_type, duration_hours, notes, price, status, assigned_at, driver_user_id, plate)
LEFT JOIN app_user d ON d.user_id = s.driver_user_id
LEFT JOIN fleet_vehicle v ON v.plate = s.plate
LEFT JOIN app_user a ON a.user_id = 'admin'
WHERE NOT EXISTS (
    SELECT 1
    FROM ride_service rs
    WHERE rs.notes = s.notes
);

INSERT INTO financial_transaction (
    transaction_type,
    category,
    description,
    amount,
    currency,
    transaction_date,
    service_id,
    vehicle_id,
    driver_id,
    deadline_occurrence_id,
    notes,
    auto_created,
    source_key,
    voided,
    created_at,
    updated_at
)
SELECT
    t.transaction_type,
    t.category,
    t.description,
    t.amount,
    'EUR',
    t.transaction_date,
    rs.id,
    v.id,
    d.id,
    occ.id,
    t.source_key,
    t.auto_created,
    t.source_key,
    FALSE,
    NOW(),
    NOW()
FROM (
    VALUES
        ('RICAVO', 'SERVIZIO', 'Incasso transfer Milano-Malpensa', 180.00, DATE '2025-01-15', 'SEED_DEMO_SVC_2025_01', 'RO-TR-001', 'driver_luca', NULL, 'SEED_FIN_2025_REV_01', TRUE),
        ('RICAVO', 'SERVIZIO', 'Incasso transfer BG-Milano Fiera', 260.00, DATE '2025-03-10', 'SEED_DEMO_SVC_2025_02', 'RO-VN-010', 'driver_sofia', NULL, 'SEED_FIN_2025_REV_02', TRUE),
        ('RICAVO', 'SERVIZIO', 'Incasso tour lago 1 giorno', 980.00, DATE '2025-06-21', 'SEED_DEMO_SVC_2025_03', 'RO-MB-021', 'driver_andrea', NULL, 'SEED_FIN_2025_REV_03', TRUE),
        ('RICAVO', 'SERVIZIO_ESTERNO', 'Servizio esterno partner corporate', 1450.00, DATE '2025-11-14', NULL, NULL, NULL, NULL, 'SEED_FIN_2025_REV_04', FALSE),
        ('COSTO', 'CARBURANTE', 'Carburante trimestre Q1 2025', 690.00, DATE '2025-03-31', NULL, 'RO-VN-010', NULL, NULL, 'SEED_FIN_2025_COST_01', FALSE),
        ('COSTO', 'ASSICURAZIONE', 'Pagamento assicurazione annuale sedan', 1120.00, DATE '2025-09-10', NULL, 'RO-TR-001', NULL, 'SEED_DEMO_OCC_2025_A', 'SEED_FIN_2025_COST_02', TRUE),
        ('COSTO', 'TAGLIANDO', 'Tagliando periodico sedan', 325.00, DATE '2025-11-18', NULL, 'RO-TR-001', NULL, 'SEED_DEMO_OCC_2025_B', 'SEED_FIN_2025_COST_03', TRUE),

        ('RICAVO', 'SERVIZIO', 'Incasso transfer Milano-Linate', 130.00, DATE '2026-01-18', 'SEED_DEMO_SVC_2026_01', 'RO-TR-001', 'driver_sofia', NULL, 'SEED_FIN_2026_REV_01', TRUE),
        ('RICAVO', 'SERVIZIO', 'Acconto servizio transfer fiera', 210.00, DATE '2026-02-20', 'SEED_DEMO_SVC_2026_02', 'RO-VN-010', 'driver_andrea', NULL, 'SEED_FIN_2026_REV_02', FALSE),
        ('RICAVO', 'EXTRA', 'Extra attesa cliente premium', 75.00, DATE '2026-02-20', 'SEED_DEMO_SVC_2026_02', 'RO-VN-010', 'driver_andrea', NULL, 'SEED_FIN_2026_REV_03', FALSE),
        ('RICAVO', 'SERVIZIO', 'Incasso transfer Milano-Como', 280.00, DATE '2026-03-10', 'SEED_DEMO_SVC_2026_05', 'RO-SV-105', 'driver_luca', NULL, 'SEED_FIN_2026_REV_04', TRUE),
        ('COSTO', 'REVISIONE', 'Revisione ministeriale van', 118.00, DATE '2026-01-08', NULL, 'RO-VN-010', NULL, 'SEED_DEMO_OCC_2026_A', 'SEED_FIN_2026_COST_01', TRUE),
        ('COSTO', 'PEDAGGIO', 'Pedaggi autostradali gennaio-febbraio', 164.00, DATE '2026-02-28', NULL, NULL, NULL, NULL, 'SEED_FIN_2026_COST_02', FALSE),
        ('COSTO', 'PARCHEGGIO', 'Parcheggi aeroportuali invernali', 96.00, DATE '2026-02-28', NULL, NULL, NULL, NULL, 'SEED_FIN_2026_COST_03', FALSE),
        ('COSTO', 'CARBURANTE', 'Rifornimento settimana 10 marzo', 92.00, DATE '2026-03-09', NULL, 'RO-SV-105', NULL, NULL, 'SEED_FIN_2026_COST_04', FALSE)
) AS t(transaction_type, category, description, amount, transaction_date, service_note, plate, driver_user_id, occ_note, source_key, auto_created)
LEFT JOIN ride_service rs
    ON rs.notes = t.service_note
LEFT JOIN fleet_vehicle v
    ON v.plate = t.plate
LEFT JOIN app_user d
    ON d.user_id = t.driver_user_id
LEFT JOIN fleet_vehicle_deadline_occurrence occ
    ON occ.notes = t.occ_note
ON CONFLICT (source_key) WHERE source_key IS NOT NULL DO UPDATE SET
    transaction_type = EXCLUDED.transaction_type,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    amount = EXCLUDED.amount,
    currency = EXCLUDED.currency,
    transaction_date = EXCLUDED.transaction_date,
    service_id = EXCLUDED.service_id,
    vehicle_id = EXCLUDED.vehicle_id,
    driver_id = EXCLUDED.driver_id,
    deadline_occurrence_id = EXCLUDED.deadline_occurrence_id,
    notes = EXCLUDED.notes,
    auto_created = EXCLUDED.auto_created,
    updated_at = NOW();

COMMIT;
