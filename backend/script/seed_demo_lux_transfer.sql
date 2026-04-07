-- =============================================================
-- SEED DEMO: Lux Transfer Milano Srl  (tenant_id = 5)
-- Credenziali utenti:
--   gestionale01  / GesLux2025!
--   mario.rossi   / Driver2025!
--   luigi.bianchi / Driver2025!
--   anna.ferrari  / Driver2025!
-- =============================================================

BEGIN;

-- ----------------------------------------------------------------
-- 1. AGGIORNA profilo gestionale01 già creato (id=36)
-- ----------------------------------------------------------------
UPDATE app_user
SET first_name = 'Marco',
    last_name  = 'Verdi',
    mobile_phone = '+39 02 9876543'
WHERE id = 36;

-- ----------------------------------------------------------------
-- 2. DRIVER
-- ----------------------------------------------------------------
INSERT INTO app_user (email, password_hash, role, enabled, user_id, tenant_id,
                      first_name, last_name, birth_date, mobile_phone,
                      license_number, license_types_json, license_expiry_date,
                      residential_addresses_json)
VALUES
  ('mario.rossi@luxtransfer.it',
   '$2a$10$G1sltSjPY4cqb17DKHS1fewDNyYdRMlZfrPB2mJXfKYPzFZNqgj0i',
   'DRIVER', TRUE, 'mario.rossi', 5,
   'Mario', 'Rossi', '1985-03-12', '+39 335 1122334',
   'MI2345678B', '["B","D"]', '2028-06-30',
   '["Via Roma 14, Milano"]'),

  ('luigi.bianchi@luxtransfer.it',
   '$2a$10$G1sltSjPY4cqb17DKHS1fewDNyYdRMlZfrPB2mJXfKYPzFZNqgj0i',
   'DRIVER', TRUE, 'luigi.bianchi', 5,
   'Luigi', 'Bianchi', '1978-11-22', '+39 347 5566778',
   'MI9876543A', '["B","D","DE"]', '2027-09-15',
   '["Corso Buenos Aires 55, Milano"]'),

  ('anna.ferrari@luxtransfer.it',
   '$2a$10$G1sltSjPY4cqb17DKHS1fewDNyYdRMlZfrPB2mJXfKYPzFZNqgj0i',
   'DRIVER', TRUE, 'anna.ferrari', 5,
   'Anna', 'Ferrari', '1992-07-04', '+39 329 9988776',
   'MI1234567C', '["B"]', '2026-12-31',
   '["Via Montenapoleone 8, Milano"]');

-- ----------------------------------------------------------------
-- 3. FLEET VEHICLES
-- ----------------------------------------------------------------
INSERT INTO fleet_vehicle (plate, seats, vehicle_type, notes, tenant_id)
VALUES
  ('EW451AB', 8,  'MINIBUS', 'Mercedes Vito Tourer Extra-Long 2022 - 8 pax', 5),
  ('CH789XY', 4,  'SEDAN',   'BMW Serie 7 750i 2023 - executive sedan',       5),
  ('GH123KL', 9,  'VAN',     'Mercedes Sprinter 319 2021 - NCC 9 pax',        5),
  ('MM456GH', 4,  'SEDAN',   'Audi A6 50 TDI 2022 - business',                5);

-- ----------------------------------------------------------------
-- 4. PIANI DI SCADENZA (deadline_plan)
-- ----------------------------------------------------------------
-- Recuperiamo gli id vehicle con subquery inline
-- Vehicle 1: EW451AB
INSERT INTO fleet_vehicle_deadline_plan
  (vehicle_id, deadline_type, title, description, recurrence_months, next_due_date,
   standard_cost_amount, currency, active, notes, tenant_id)
SELECT v.id, 'ASSICURAZIONE', 'Polizza RCA + Kasko', 'Rinnovabile ogni 12 mesi - Zurich Insurance',
       12, '2026-08-01', 1850.00, 'EUR', TRUE, 'Broker: Studio Martinelli', 5
FROM fleet_vehicle v WHERE v.plate='EW451AB' AND v.tenant_id=5;

INSERT INTO fleet_vehicle_deadline_plan
  (vehicle_id, deadline_type, title, description, recurrence_months, next_due_date,
   standard_cost_amount, currency, active, notes, tenant_id)
SELECT v.id, 'BOLLO', 'Bollo auto annuale', NULL,
       12, '2026-11-30', 320.00, 'EUR', TRUE, NULL, 5
FROM fleet_vehicle v WHERE v.plate='EW451AB' AND v.tenant_id=5;

INSERT INTO fleet_vehicle_deadline_plan
  (vehicle_id, deadline_type, title, description, recurrence_months, next_due_date,
   standard_cost_amount, currency, active, notes, tenant_id)
SELECT v.id, 'TAGLIANDO', 'Tagliando ordinario 30.000 km', 'Ogni 12 mesi o 30.000 km - Officina Boscolo',
       12, '2026-06-15', 480.00, 'EUR', TRUE, NULL, 5
FROM fleet_vehicle v WHERE v.plate='EW451AB' AND v.tenant_id=5;

-- Vehicle 2: CH789XY
INSERT INTO fleet_vehicle_deadline_plan
  (vehicle_id, deadline_type, title, description, recurrence_months, next_due_date,
   standard_cost_amount, currency, active, notes, tenant_id)
SELECT v.id, 'ASSICURAZIONE', 'Polizza RCA', 'AXA Fleet - rinnovo annuale',
       12, '2026-05-15', 2100.00, 'EUR', TRUE, NULL, 5
FROM fleet_vehicle v WHERE v.plate='CH789XY' AND v.tenant_id=5;

INSERT INTO fleet_vehicle_deadline_plan
  (vehicle_id, deadline_type, title, description, recurrence_months, next_due_date,
   standard_cost_amount, currency, active, notes, tenant_id)
SELECT v.id, 'BOLLO', 'Bollo auto annuale', NULL,
       12, '2026-10-31', 280.00, 'EUR', TRUE, NULL, 5
FROM fleet_vehicle v WHERE v.plate='CH789XY' AND v.tenant_id=5;

INSERT INTO fleet_vehicle_deadline_plan
  (vehicle_id, deadline_type, title, description, recurrence_months, next_due_date,
   standard_cost_amount, currency, active, notes, tenant_id)
SELECT v.id, 'REVISIONE', 'Revisione periodica', 'Ogni 24 mesi - Motorizzazione o officina autorizzata',
       24, '2027-03-31', 120.00, 'EUR', TRUE, NULL, 5
FROM fleet_vehicle v WHERE v.plate='CH789XY' AND v.tenant_id=5;

-- Vehicle 3: GH123KL
INSERT INTO fleet_vehicle_deadline_plan
  (vehicle_id, deadline_type, title, description, recurrence_months, next_due_date,
   standard_cost_amount, currency, active, notes, tenant_id)
SELECT v.id, 'ASSICURAZIONE', 'Polizza RCA + ARD', 'Generali Fleet',
       12, '2026-07-01', 2400.00, 'EUR', TRUE, 'Include assistenza stradale', 5
FROM fleet_vehicle v WHERE v.plate='GH123KL' AND v.tenant_id=5;

INSERT INTO fleet_vehicle_deadline_plan
  (vehicle_id, deadline_type, title, description, recurrence_months, next_due_date,
   standard_cost_amount, currency, active, notes, tenant_id)
SELECT v.id, 'TAGLIANDO', 'Tagliando Sprinter', 'Officina MB Center Milano',
       12, '2026-09-30', 620.00, 'EUR', TRUE, NULL, 5
FROM fleet_vehicle v WHERE v.plate='GH123KL' AND v.tenant_id=5;

-- Vehicle 4: MM456GH
INSERT INTO fleet_vehicle_deadline_plan
  (vehicle_id, deadline_type, title, description, recurrence_months, next_due_date,
   standard_cost_amount, currency, active, notes, tenant_id)
SELECT v.id, 'ASSICURAZIONE', 'Polizza RCA Audi', 'Allianz',
       12, '2026-09-30', 1950.00, 'EUR', TRUE, NULL, 5
FROM fleet_vehicle v WHERE v.plate='MM456GH' AND v.tenant_id=5;

INSERT INTO fleet_vehicle_deadline_plan
  (vehicle_id, deadline_type, title, description, recurrence_months, next_due_date,
   standard_cost_amount, currency, active, notes, tenant_id)
SELECT v.id, 'BOLLO', 'Bollo auto', NULL,
       12, '2027-01-31', 260.00, 'EUR', TRUE, NULL, 5
FROM fleet_vehicle v WHERE v.plate='MM456GH' AND v.tenant_id=5;

-- ----------------------------------------------------------------
-- 5. OCCORRENZE DI SCADENZA (storico 2024-2025 + 2026 futuri)
-- ----------------------------------------------------------------

-- EW451AB ----------------------------------------------------
-- Assicurazione 2024 (passata, PAGATA)
INSERT INTO fleet_vehicle_deadline_occurrence
  (vehicle_id, plan_id, deadline_type, title, due_date, status, cost_amount, currency,
   payment_date, notes, tenant_id)
SELECT v.id, p.id, 'ASSICURAZIONE', 'Polizza RCA + Kasko 2024',
       '2024-08-01', 'PAGATA', 1750.00, 'EUR', '2024-07-28',
       'Pagata con bonifico - ricevuta 2024/INS/0892', 5
FROM fleet_vehicle v
JOIN fleet_vehicle_deadline_plan p ON p.vehicle_id=v.id AND p.deadline_type='ASSICURAZIONE'
WHERE v.plate='EW451AB' AND v.tenant_id=5;

-- Assicurazione 2025 (passata, PAGATA)
INSERT INTO fleet_vehicle_deadline_occurrence
  (vehicle_id, plan_id, deadline_type, title, due_date, status, cost_amount, currency,
   payment_date, notes, tenant_id)
SELECT v.id, p.id, 'ASSICURAZIONE', 'Polizza RCA + Kasko 2025',
       '2025-08-01', 'PAGATA', 1800.00, 'EUR', '2025-07-30',
       'Pagata - ricevuta 2025/INS/1104', 5
FROM fleet_vehicle v
JOIN fleet_vehicle_deadline_plan p ON p.vehicle_id=v.id AND p.deadline_type='ASSICURAZIONE'
WHERE v.plate='EW451AB' AND v.tenant_id=5;

-- Bollo 2024 (PAGATO)
INSERT INTO fleet_vehicle_deadline_occurrence
  (vehicle_id, plan_id, deadline_type, title, due_date, status, cost_amount, currency,
   payment_date, notes, tenant_id)
SELECT v.id, p.id, 'BOLLO', 'Bollo 2024',
       '2024-11-30', 'PAGATA', 310.00, 'EUR', '2024-11-15',
       'Pagato online ACI', 5
FROM fleet_vehicle v
JOIN fleet_vehicle_deadline_plan p ON p.vehicle_id=v.id AND p.deadline_type='BOLLO'
WHERE v.plate='EW451AB' AND v.tenant_id=5;

-- Bollo 2025 (PAGATO)
INSERT INTO fleet_vehicle_deadline_occurrence
  (vehicle_id, plan_id, deadline_type, title, due_date, status, cost_amount, currency,
   payment_date, notes, tenant_id)
SELECT v.id, p.id, 'BOLLO', 'Bollo 2025',
       '2025-11-30', 'PAGATA', 320.00, 'EUR', '2025-11-12',
       'Pagato online ACI', 5
FROM fleet_vehicle v
JOIN fleet_vehicle_deadline_plan p ON p.vehicle_id=v.id AND p.deadline_type='BOLLO'
WHERE v.plate='EW451AB' AND v.tenant_id=5;

-- Tagliando 2024 (ESEGUITO)
INSERT INTO fleet_vehicle_deadline_occurrence
  (vehicle_id, plan_id, deadline_type, title, due_date, status, cost_amount, currency,
   execution_date, notes, tenant_id)
SELECT v.id, p.id, 'TAGLIANDO', 'Tagliando 60.000 km - 2024',
       '2024-06-15', 'ESEGUITA', 460.00, 'EUR', '2024-06-14',
       'Officina Boscolo - fattura 2024/TAI/0341', 5
FROM fleet_vehicle v
JOIN fleet_vehicle_deadline_plan p ON p.vehicle_id=v.id AND p.deadline_type='TAGLIANDO'
WHERE v.plate='EW451AB' AND v.tenant_id=5;

-- Tagliando 2025 (ESEGUITO)
INSERT INTO fleet_vehicle_deadline_occurrence
  (vehicle_id, plan_id, deadline_type, title, due_date, status, cost_amount, currency,
   execution_date, notes, tenant_id)
SELECT v.id, p.id, 'TAGLIANDO', 'Tagliando 90.000 km - 2025',
       '2025-06-15', 'ESEGUITA', 475.00, 'EUR', '2025-06-10',
       'Officina Boscolo - fattura 2025/TAI/0512', 5
FROM fleet_vehicle v
JOIN fleet_vehicle_deadline_plan p ON p.vehicle_id=v.id AND p.deadline_type='TAGLIANDO'
WHERE v.plate='EW451AB' AND v.tenant_id=5;

-- Manutenzione straordinaria 2024 (sostituzione frizioni)
INSERT INTO fleet_vehicle_deadline_occurrence
  (vehicle_id, plan_id, deadline_type, title, due_date, status, cost_amount, currency,
   execution_date, notes, tenant_id)
SELECT v.id, NULL, 'ALTRO', 'Sostituzione frizione e gruppo frizione',
       '2024-09-20', 'ESEGUITA', 1200.00, 'EUR', '2024-09-22',
       'Riparazione straordinaria - Officina Boscolo fat. 2024/EX/0088', 5
FROM fleet_vehicle v WHERE v.plate='EW451AB' AND v.tenant_id=5;

-- Scadenza futura 2026 (DA_ESEGUIRE)
INSERT INTO fleet_vehicle_deadline_occurrence
  (vehicle_id, plan_id, deadline_type, title, due_date, status, cost_amount, currency,
   notes, tenant_id)
SELECT v.id, p.id, 'ASSICURAZIONE', 'Polizza RCA + Kasko 2026',
       '2026-08-01', 'DA_ESEGUIRE', 1850.00, 'EUR',
       'Da rinnovare entro scadenza', 5
FROM fleet_vehicle v
JOIN fleet_vehicle_deadline_plan p ON p.vehicle_id=v.id AND p.deadline_type='ASSICURAZIONE'
WHERE v.plate='EW451AB' AND v.tenant_id=5;

-- CH789XY ----------------------------------------------------
INSERT INTO fleet_vehicle_deadline_occurrence
  (vehicle_id, plan_id, deadline_type, title, due_date, status, cost_amount, currency,
   payment_date, notes, tenant_id)
SELECT v.id, p.id, 'ASSICURAZIONE', 'Polizza RCA BMW 2025',
       '2025-05-15', 'PAGATA', 2050.00, 'EUR', '2025-05-10',
       'AXA Fleet - ricevuta 2025/INS/0761', 5
FROM fleet_vehicle v
JOIN fleet_vehicle_deadline_plan p ON p.vehicle_id=v.id AND p.deadline_type='ASSICURAZIONE'
WHERE v.plate='CH789XY' AND v.tenant_id=5;

INSERT INTO fleet_vehicle_deadline_occurrence
  (vehicle_id, plan_id, deadline_type, title, due_date, status, cost_amount, currency,
   notes, tenant_id)
SELECT v.id, p.id, 'ASSICURAZIONE', 'Polizza RCA BMW 2026',
       '2026-05-15', 'IN_SCADENZA', 2100.00, 'EUR',
       'Scadenza imminente - contattare broker', 5
FROM fleet_vehicle v
JOIN fleet_vehicle_deadline_plan p ON p.vehicle_id=v.id AND p.deadline_type='ASSICURAZIONE'
WHERE v.plate='CH789XY' AND v.tenant_id=5;

INSERT INTO fleet_vehicle_deadline_occurrence
  (vehicle_id, plan_id, deadline_type, title, due_date, status, cost_amount, currency,
   payment_date, notes, tenant_id)
SELECT v.id, p.id, 'BOLLO', 'Bollo BMW 2025',
       '2025-10-31', 'PAGATA', 275.00, 'EUR', '2025-10-20',
       'Pagato ACI', 5
FROM fleet_vehicle v
JOIN fleet_vehicle_deadline_plan p ON p.vehicle_id=v.id AND p.deadline_type='BOLLO'
WHERE v.plate='CH789XY' AND v.tenant_id=5;

INSERT INTO fleet_vehicle_deadline_occurrence
  (vehicle_id, plan_id, deadline_type, title, due_date, status, cost_amount, currency,
   execution_date, notes, tenant_id)
SELECT v.id, p.id, 'REVISIONE', 'Revisione periodica 2025',
       '2025-03-31', 'ESEGUITA', 118.00, 'EUR', '2025-03-28',
       'Motorizzazione Civile Milano', 5
FROM fleet_vehicle v
JOIN fleet_vehicle_deadline_plan p ON p.vehicle_id=v.id AND p.deadline_type='REVISIONE'
WHERE v.plate='CH789XY' AND v.tenant_id=5;

-- Manutenzione straordinaria BMW (sostituzione batteria)
INSERT INTO fleet_vehicle_deadline_occurrence
  (vehicle_id, plan_id, deadline_type, title, due_date, status, cost_amount, currency,
   execution_date, notes, tenant_id)
SELECT v.id, NULL, 'ALTRO', 'Sostituzione batteria 12V AGM',
       '2025-01-15', 'ESEGUITA', 380.00, 'EUR', '2025-01-16',
       'BMW Center Milano - fat. 2025/BMW/0032', 5
FROM fleet_vehicle v WHERE v.plate='CH789XY' AND v.tenant_id=5;

-- GH123KL ----------------------------------------------------
INSERT INTO fleet_vehicle_deadline_occurrence
  (vehicle_id, plan_id, deadline_type, title, due_date, status, cost_amount, currency,
   payment_date, notes, tenant_id)
SELECT v.id, p.id, 'ASSICURAZIONE', 'Polizza RCA + ARD Sprinter 2025',
       '2025-07-01', 'PAGATA', 2350.00, 'EUR', '2025-06-28',
       'Generali Fleet - pol. 2025/GFL/44221', 5
FROM fleet_vehicle v
JOIN fleet_vehicle_deadline_plan p ON p.vehicle_id=v.id AND p.deadline_type='ASSICURAZIONE'
WHERE v.plate='GH123KL' AND v.tenant_id=5;

INSERT INTO fleet_vehicle_deadline_occurrence
  (vehicle_id, plan_id, deadline_type, title, due_date, status, cost_amount, currency,
   notes, tenant_id)
SELECT v.id, p.id, 'ASSICURAZIONE', 'Polizza RCA + ARD Sprinter 2026',
       '2026-07-01', 'DA_ESEGUIRE', 2400.00, 'EUR',
       'Da rinnovare', 5
FROM fleet_vehicle v
JOIN fleet_vehicle_deadline_plan p ON p.vehicle_id=v.id AND p.deadline_type='ASSICURAZIONE'
WHERE v.plate='GH123KL' AND v.tenant_id=5;

INSERT INTO fleet_vehicle_deadline_occurrence
  (vehicle_id, plan_id, deadline_type, title, due_date, status, cost_amount, currency,
   execution_date, notes, tenant_id)
SELECT v.id, p.id, 'TAGLIANDO', 'Tagliando Sprinter 2025',
       '2025-09-30', 'ESEGUITA', 610.00, 'EUR', '2025-09-25',
       'MB Center Milano - fat. 2025/MBS/0291', 5
FROM fleet_vehicle v
JOIN fleet_vehicle_deadline_plan p ON p.vehicle_id=v.id AND p.deadline_type='TAGLIANDO'
WHERE v.plate='GH123KL' AND v.tenant_id=5;

-- Manutenzione straordinaria Sprinter: turbina
INSERT INTO fleet_vehicle_deadline_occurrence
  (vehicle_id, plan_id, deadline_type, title, due_date, status, cost_amount, currency,
   execution_date, notes, tenant_id)
SELECT v.id, NULL, 'ALTRO', 'Sostituzione turbina e intercooler',
       '2024-11-10', 'ESEGUITA', 2800.00, 'EUR', '2024-11-14',
       'MB Center Milano - fat. 2024/MBS/0188 - garanzia scaduta', 5
FROM fleet_vehicle v WHERE v.plate='GH123KL' AND v.tenant_id=5;

-- MM456GH ----------------------------------------------------
INSERT INTO fleet_vehicle_deadline_occurrence
  (vehicle_id, plan_id, deadline_type, title, due_date, status, cost_amount, currency,
   payment_date, notes, tenant_id)
SELECT v.id, p.id, 'ASSICURAZIONE', 'Polizza RCA Audi 2025',
       '2025-09-30', 'PAGATA', 1920.00, 'EUR', '2025-09-26',
       'Allianz Direct - pol. AZ2025/8821', 5
FROM fleet_vehicle v
JOIN fleet_vehicle_deadline_plan p ON p.vehicle_id=v.id AND p.deadline_type='ASSICURAZIONE'
WHERE v.plate='MM456GH' AND v.tenant_id=5;

INSERT INTO fleet_vehicle_deadline_occurrence
  (vehicle_id, plan_id, deadline_type, title, due_date, status, cost_amount, currency,
   notes, tenant_id)
SELECT v.id, p.id, 'ASSICURAZIONE', 'Polizza RCA Audi 2026',
       '2026-09-30', 'DA_ESEGUIRE', 1950.00, 'EUR', 'Da rinnovare', 5
FROM fleet_vehicle v
JOIN fleet_vehicle_deadline_plan p ON p.vehicle_id=v.id AND p.deadline_type='ASSICURAZIONE'
WHERE v.plate='MM456GH' AND v.tenant_id=5;

INSERT INTO fleet_vehicle_deadline_occurrence
  (vehicle_id, plan_id, deadline_type, title, due_date, status, cost_amount, currency,
   payment_date, notes, tenant_id)
SELECT v.id, p.id, 'BOLLO', 'Bollo Audi 2026',
       '2026-01-31', 'PAGATA', 258.00, 'EUR', '2026-01-20',
       'Pagato ACI', 5
FROM fleet_vehicle v
JOIN fleet_vehicle_deadline_plan p ON p.vehicle_id=v.id AND p.deadline_type='BOLLO'
WHERE v.plate='MM456GH' AND v.tenant_id=5;

-- ----------------------------------------------------------------
-- 6. SERVIZI - storico 2025 e nuovi 2026
--    Usiamo CTE per recuperare gli ID degli utenti
-- ----------------------------------------------------------------

-- Helper: recupera ID utenti
-- mario.rossi  = (SELECT id FROM app_user WHERE user_id='mario.rossi' AND tenant_id=5)
-- luigi.bianchi = ...
-- anna.ferrari = ...
-- gestionale01 = (SELECT id FROM app_user WHERE user_id='gestionale01' AND tenant_id=5)

-- ------ SERVIZI 2025 (storici) ------ --

-- S01: Transfer malpensa - CLOSED (eseguito e chiuso), pagato
INSERT INTO ride_service
  (start_at, pickup_location, destination, service_type, duration_hours, notes,
   price, status, assigned_driver_id, assigned_vehicle_id, assigned_by_user_id, assigned_at,
   client_name, client_phone, client_email, passengers_count, itinerary,
   service_assignment_type, internal_booking_reference, tenant_id)
SELECT '2025-02-15 08:00:00',
       'Via Melchiorre Gioia 22, Milano', 'Aeroporto Milano Malpensa T2',
       'TRANSFER', 2, 'VIP client - preferisce silenzio',
       180.00, 'CLOSED',
       (SELECT id FROM app_user WHERE user_id='mario.rossi' AND tenant_id=5),
       (SELECT id FROM fleet_vehicle WHERE plate='CH789XY' AND tenant_id=5),
       (SELECT id FROM app_user WHERE user_id='gestionale01' AND tenant_id=5),
       '2025-02-14 17:00:00',
       'Dott. Alessandro Bruni', '+39 347 1234567', 'a.bruni@businessmail.it',
       1, 'Pickup domicilio → Malpensa T2 partenza ore 10:20',
       'INTERNAL', 'LUX-2025-0001', 5;

-- S02: Transfer linate - CLOSED, storico 2025
INSERT INTO ride_service
  (start_at, pickup_location, destination, service_type, duration_hours, notes,
   price, status, assigned_driver_id, assigned_vehicle_id, assigned_by_user_id, assigned_at,
   client_name, client_phone, passengers_count,
   service_assignment_type, internal_booking_reference, tenant_id)
SELECT '2025-03-10 14:30:00',
       'Hotel Boscolo, Piazza della Repubblica, Milano', 'Aeroporto Linate',
       'TRANSFER', 1, NULL,
       120.00, 'CLOSED',
       (SELECT id FROM app_user WHERE user_id='luigi.bianchi' AND tenant_id=5),
       (SELECT id FROM fleet_vehicle WHERE plate='EW451AB' AND tenant_id=5),
       (SELECT id FROM app_user WHERE user_id='gestionale01' AND tenant_id=5),
       '2025-03-09 10:00:00',
       'Famiglia Colombo', '+39 335 8877665', 4,
       'INTERNAL', 'LUX-2025-0002', 5;

-- S03: Tour Milano - CLOSED
INSERT INTO ride_service
  (start_at, pickup_location, destination, service_type, duration_hours, notes,
   price, status, assigned_driver_id, assigned_vehicle_id, assigned_by_user_id, assigned_at,
   client_name, client_phone, passengers_count,
   service_assignment_type, internal_booking_reference, tenant_id)
SELECT '2025-04-22 10:00:00',
       'Hotel Principe di Savoia, Piazza della Repubblica Metro, Milano', 'Duomo di Milano',
       'TOUR', 4, 'Giro panoramico centro storico + aperitivo',
       350.00, 'CLOSED',
       (SELECT id FROM app_user WHERE user_id='anna.ferrari' AND tenant_id=5),
       (SELECT id FROM fleet_vehicle WHERE plate='EW451AB' AND tenant_id=5),
       (SELECT id FROM app_user WHERE user_id='gestionale01' AND tenant_id=5),
       '2025-04-20 09:00:00',
       'Mr. John Smith', '+44 7712 334455', 6,
       'INTERNAL', 'LUX-2025-0003', 5;

-- S04: Transfer 2025 - CLOSED (con veicolo Sprinter, gruppo)
INSERT INTO ride_service
  (start_at, pickup_location, destination, service_type, duration_hours, notes,
   price, status, assigned_driver_id, assigned_vehicle_id, assigned_by_user_id, assigned_at,
   client_name, client_phone, passengers_count,
   service_assignment_type, internal_booking_reference, tenant_id)
SELECT '2025-06-05 07:00:00',
       'Fiera Milano, Rho', 'Hotel Crowne Plaza, Linate',
       'TRANSFER', 1, 'Gruppo dirigenti - 8 persone con bagagli',
       280.00, 'CLOSED',
       (SELECT id FROM app_user WHERE user_id='mario.rossi' AND tenant_id=5),
       (SELECT id FROM fleet_vehicle WHERE plate='GH123KL' AND tenant_id=5),
       (SELECT id FROM app_user WHERE user_id='gestionale01' AND tenant_id=5),
       '2025-06-04 15:00:00',
       'Azienda TechNord Srl', '+39 02 4455667', 8,
       'INTERNAL', 'LUX-2025-0004', 5;

-- S05: Tour lago di Como (settembre 2025) - CLOSED
INSERT INTO ride_service
  (start_at, pickup_location, destination, service_type, duration_hours, notes,
   price, status, assigned_driver_id, assigned_vehicle_id, assigned_by_user_id, assigned_at,
   client_name, client_phone, passengers_count, itinerary,
   service_assignment_type, internal_booking_reference, tenant_id)
SELECT '2025-09-14 09:00:00',
       'Hotel Excelsior Gallia, Milano Centrale', 'Como - Villa del Balbianello',
       'TOUR', 8, 'Tour privato lago di Como con pranzo al ristorante',
       780.00, 'CLOSED',
       (SELECT id FROM app_user WHERE user_id='luigi.bianchi' AND tenant_id=5),
       (SELECT id FROM fleet_vehicle WHERE plate='EW451AB' AND tenant_id=5),
       (SELECT id FROM app_user WHERE user_id='gestionale01' AND tenant_id=5),
       '2025-09-10 11:00:00',
       'Sig.ra Patricia Rosenberg', '+1 312 8889999', 4,
       'Milano → Varenna → Villa del Balbianello → Bellagio → rientro Milano',
       'INTERNAL', 'LUX-2025-0005', 5;

-- S06: Transfer dicembre 2025 - CLOSED
INSERT INTO ride_service
  (start_at, pickup_location, destination, service_type, duration_hours, notes,
   price, status, assigned_driver_id, assigned_vehicle_id, assigned_by_user_id, assigned_at,
   client_name, client_phone, passengers_count,
   service_assignment_type, internal_booking_reference, tenant_id)
SELECT '2025-12-20 06:30:00',
       'Via Brera 10, Milano', 'Aeroporto Bergamo Orio al Serio',
       'TRANSFER', 2, 'Partenza mattutina - possibile traffico A4',
       220.00, 'CLOSED',
       (SELECT id FROM app_user WHERE user_id='anna.ferrari' AND tenant_id=5),
       (SELECT id FROM fleet_vehicle WHERE plate='MM456GH' AND tenant_id=5),
       (SELECT id FROM app_user WHERE user_id='gestionale01' AND tenant_id=5),
       '2025-12-18 14:00:00',
       'Ing. Roberto Palumbo', '+39 349 6677889', 2,
       'INTERNAL', 'LUX-2025-0006', 5;

-- ------ SERVIZI 2026 ------ --

-- S07: Transfer 2026 - EXECUTED (eseguito, non ancora chiuso)
INSERT INTO ride_service
  (start_at, pickup_location, destination, service_type, duration_hours, notes,
   price, status, assigned_driver_id, assigned_vehicle_id, assigned_by_user_id, assigned_at,
   client_name, client_phone, passengers_count,
   service_assignment_type, internal_booking_reference, tenant_id)
SELECT '2026-03-05 09:00:00',
       'Aeroporto Malpensa T1', 'Four Seasons Hotel, Via Gesu 6, Milano',
       'TRANSFER', 2, 'Accoglienza con cartello - volo AZ204 da New York',
       200.00, 'EXECUTED',
       (SELECT id FROM app_user WHERE user_id='mario.rossi' AND tenant_id=5),
       (SELECT id FROM fleet_vehicle WHERE plate='CH789XY' AND tenant_id=5),
       (SELECT id FROM app_user WHERE user_id='gestionale01' AND tenant_id=5),
       '2026-03-04 10:00:00',
       'Mr. David Chen', '+1 646 7778888', 1,
       'INTERNAL', 'LUX-2026-0001', 5;

-- S08: Tour Dolomiti - ASSIGNED (assegnato)
INSERT INTO ride_service
  (start_at, pickup_location, destination, service_type, duration_hours, notes,
   price, status, assigned_driver_id, assigned_vehicle_id, assigned_by_user_id, assigned_at,
   client_name, client_phone, passengers_count, itinerary,
   service_assignment_type, internal_booking_reference, tenant_id)
SELECT '2026-04-18 07:30:00',
       'Hotel Sheraton Diana Majestic, Milano', 'Cortina d''Ampezzo',
       'TOUR', 10, 'Gita Dolomiti - necessario cambio stagionale gomme',
       1200.00, 'ASSIGNED',
       (SELECT id FROM app_user WHERE user_id='luigi.bianchi' AND tenant_id=5),
       (SELECT id FROM fleet_vehicle WHERE plate='GH123KL' AND tenant_id=5),
       (SELECT id FROM app_user WHERE user_id='gestionale01' AND tenant_id=5),
       '2026-04-01 09:00:00',
       'Famiglia Tedesco', '+39 02 9988001', 7,
       'Milano → Trento → Bolzano → Cortina → overnight → rientro',
       'INTERNAL', 'LUX-2026-0002', 5;

-- S09: Transfer Malpensa - ASSIGNED (assegnato ad Anna Ferrari)
INSERT INTO ride_service
  (start_at, pickup_location, destination, service_type, duration_hours, notes,
   price, status, assigned_driver_id, assigned_vehicle_id, assigned_by_user_id, assigned_at,
   client_name, client_phone, passengers_count,
   service_assignment_type, internal_booking_reference, tenant_id)
SELECT '2026-04-12 16:00:00',
       'Aeroporto Malpensa T2', 'NH Hotel Milano Centro',
       'TRANSFER', 1, 'Volo BG777 da Londra',
       150.00, 'ASSIGNED',
       (SELECT id FROM app_user WHERE user_id='anna.ferrari' AND tenant_id=5),
       (SELECT id FROM fleet_vehicle WHERE plate='MM456GH' AND tenant_id=5),
       (SELECT id FROM app_user WHERE user_id='gestionale01' AND tenant_id=5),
       '2026-04-10 11:00:00',
       'Ms. Sophie Laurent', '+33 6 1234 5678', 1,
       'INTERNAL', 'LUX-2026-0003', 5;

-- S10: Transfer non ancora assegnato (OPEN)
INSERT INTO ride_service
  (start_at, pickup_location, destination, service_type, duration_hours, notes,
   price, status, client_name, client_phone, passengers_count,
   service_assignment_type, internal_booking_reference, tenant_id)
VALUES
  ('2026-04-25 10:00:00',
   'Palazzo Parigi Hotel, Corso di Porta Nuova 1, Milano', 'Aeroporto Linate',
   'TRANSFER', 1, NULL,
   140.00, 'OPEN',
   'Avv. Marco Gentile', '+39 335 9900112', 2,
   'INTERNAL', 'LUX-2026-0004', 5);

-- S11: Tour Cinque Terre (OPEN, non assegnato)
INSERT INTO ride_service
  (start_at, pickup_location, destination, service_type, duration_hours, notes,
   price, status, client_name, client_phone, client_email, passengers_count, itinerary,
   service_assignment_type, internal_booking_reference, tenant_id)
VALUES
  ('2026-05-10 08:00:00',
   'Hotel Excelsior Gallia, Milano', 'Vernazza, Cinque Terre',
   'TOUR', 12, 'Day tour - gruppo di 5 persone incluso pranzo',
   950.00, 'OPEN',
   'Dott.ssa Elena Marconi', '+39 339 4455667', 'e.marconi@email.com', 5,
   'Milano → A7 → Genova → Corniglia → Vernazza → Monterosso → Milano',
   'INTERNAL', 'LUX-2026-0005', 5);

-- S12: Transfer Orio (OPEN, non assegnato)
INSERT INTO ride_service
  (start_at, pickup_location, destination, service_type, duration_hours, notes,
   price, status, client_name, client_phone, passengers_count,
   service_assignment_type, internal_booking_reference, tenant_id)
VALUES
  ('2026-05-03 05:30:00',
   'Via Turati 30, Milano', 'Aeroporto Bergamo Orio al Serio',
   'TRANSFER', 2, 'Partenza molto mattutina - confermare stanotte',
   160.00, 'OPEN',
   'Sig. Claudio Manzoni', '+39 348 1122334', 3,
   'INTERNAL', 'LUX-2026-0006', 5);

-- ----------------------------------------------------------------
-- 7. TRANSAZIONI FINANZIARIE
-- ----------------------------------------------------------------

-- Ricavi servizi 2025
INSERT INTO financial_transaction
  (transaction_type, category, description, amount, currency, transaction_date,
   service_id, auto_created, source_key, tenant_id)
SELECT 'RICAVO', 'SERVIZIO', 'Pagamento servizio LUX-2025-0001 - Dott. Bruni',
       180.00, 'EUR', '2025-02-16',
       (SELECT id FROM ride_service WHERE internal_booking_reference='LUX-2025-0001' AND tenant_id=5),
       FALSE, 'svc-pay-LUX-2025-0001', 5;

INSERT INTO financial_transaction
  (transaction_type, category, description, amount, currency, transaction_date,
   service_id, auto_created, source_key, tenant_id)
SELECT 'RICAVO', 'SERVIZIO', 'Pagamento servizio LUX-2025-0002 - Fam. Colombo',
       120.00, 'EUR', '2025-03-10',
       (SELECT id FROM ride_service WHERE internal_booking_reference='LUX-2025-0002' AND tenant_id=5),
       FALSE, 'svc-pay-LUX-2025-0002', 5;

INSERT INTO financial_transaction
  (transaction_type, category, description, amount, currency, transaction_date,
   service_id, auto_created, source_key, tenant_id)
SELECT 'RICAVO', 'SERVIZIO', 'Pagamento tour Milano - Mr. John Smith',
       350.00, 'EUR', '2025-04-22',
       (SELECT id FROM ride_service WHERE internal_booking_reference='LUX-2025-0003' AND tenant_id=5),
       FALSE, 'svc-pay-LUX-2025-0003', 5;

INSERT INTO financial_transaction
  (transaction_type, category, description, amount, currency, transaction_date,
   service_id, auto_created, source_key, tenant_id)
SELECT 'RICAVO', 'SERVIZIO', 'Pagamento fiera Milano - TechNord Srl',
       280.00, 'EUR', '2025-06-05',
       (SELECT id FROM ride_service WHERE internal_booking_reference='LUX-2025-0004' AND tenant_id=5),
       FALSE, 'svc-pay-LUX-2025-0004', 5;

INSERT INTO financial_transaction
  (transaction_type, category, description, amount, currency, transaction_date,
   service_id, auto_created, source_key, tenant_id)
SELECT 'RICAVO', 'SERVIZIO', 'Pagamento tour Como - Sig.ra Rosenberg',
       780.00, 'EUR', '2025-09-15',
       (SELECT id FROM ride_service WHERE internal_booking_reference='LUX-2025-0005' AND tenant_id=5),
       FALSE, 'svc-pay-LUX-2025-0005', 5;

INSERT INTO financial_transaction
  (transaction_type, category, description, amount, currency, transaction_date,
   service_id, auto_created, source_key, tenant_id)
SELECT 'RICAVO', 'SERVIZIO', 'Pagamento transfer Bergamo - Ing. Palumbo',
       220.00, 'EUR', '2025-12-20',
       (SELECT id FROM ride_service WHERE internal_booking_reference='LUX-2025-0006' AND tenant_id=5),
       FALSE, 'svc-pay-LUX-2025-0006', 5;

-- Costi fleet 2024-2025
INSERT INTO financial_transaction
  (transaction_type, category, description, amount, currency, transaction_date,
   vehicle_id, auto_created, source_key, tenant_id)
SELECT 'COSTO', 'ASSICURAZIONE', 'Polizza RCA Vito 2024',
       1750.00, 'EUR', '2024-07-28',
       (SELECT id FROM fleet_vehicle WHERE plate='EW451AB' AND tenant_id=5),
       FALSE, 'ins-EW451AB-2024', 5;

INSERT INTO financial_transaction
  (transaction_type, category, description, amount, currency, transaction_date,
   vehicle_id, auto_created, source_key, tenant_id)
SELECT 'COSTO', 'TAGLIANDO', 'Tagliando 60k Vito 2024 - Officina Boscolo',
       460.00, 'EUR', '2024-06-14',
       (SELECT id FROM fleet_vehicle WHERE plate='EW451AB' AND tenant_id=5),
       FALSE, 'tag-EW451AB-2024', 5;

INSERT INTO financial_transaction
  (transaction_type, category, description, amount, currency, transaction_date,
   vehicle_id, auto_created, source_key, tenant_id)
SELECT 'COSTO', 'MANUTENZIONE_STRAORDINARIA', 'Sostituzione frizione Vito - Officina Boscolo',
       1200.00, 'EUR', '2024-09-22',
       (SELECT id FROM fleet_vehicle WHERE plate='EW451AB' AND tenant_id=5),
       FALSE, 'ext-EW451AB-2024-frizione', 5;

INSERT INTO financial_transaction
  (transaction_type, category, description, amount, currency, transaction_date,
   vehicle_id, auto_created, source_key, tenant_id)
SELECT 'COSTO', 'MANUTENZIONE_STRAORDINARIA', 'Sostituzione turbina Sprinter - MB Center',
       2800.00, 'EUR', '2024-11-14',
       (SELECT id FROM fleet_vehicle WHERE plate='GH123KL' AND tenant_id=5),
       FALSE, 'ext-GH123KL-2024-turbina', 5;

INSERT INTO financial_transaction
  (transaction_type, category, description, amount, currency, transaction_date,
   vehicle_id, auto_created, source_key, tenant_id)
SELECT 'COSTO', 'ASSICURAZIONE', 'Polizza RCA Vito 2025',
       1800.00, 'EUR', '2025-07-30',
       (SELECT id FROM fleet_vehicle WHERE plate='EW451AB' AND tenant_id=5),
       FALSE, 'ins-EW451AB-2025', 5;

INSERT INTO financial_transaction
  (transaction_type, category, description, amount, currency, transaction_date,
   vehicle_id, auto_created, source_key, tenant_id)
SELECT 'COSTO', 'ASSICURAZIONE', 'Polizza RCA BMW 2025 - AXA',
       2050.00, 'EUR', '2025-05-10',
       (SELECT id FROM fleet_vehicle WHERE plate='CH789XY' AND tenant_id=5),
       FALSE, 'ins-CH789XY-2025', 5;

INSERT INTO financial_transaction
  (transaction_type, category, description, amount, currency, transaction_date,
   vehicle_id, auto_created, source_key, tenant_id)
SELECT 'COSTO', 'ASSICURAZIONE', 'Polizza Sprinter 2025 - Generali',
       2350.00, 'EUR', '2025-06-28',
       (SELECT id FROM fleet_vehicle WHERE plate='GH123KL' AND tenant_id=5),
       FALSE, 'ins-GH123KL-2025', 5;

INSERT INTO financial_transaction
  (transaction_type, category, description, amount, currency, transaction_date,
   vehicle_id, auto_created, source_key, tenant_id)
SELECT 'COSTO', 'TAGLIANDO', 'Tagliando Vito 2025',
       475.00, 'EUR', '2025-06-10',
       (SELECT id FROM fleet_vehicle WHERE plate='EW451AB' AND tenant_id=5),
       FALSE, 'tag-EW451AB-2025', 5;

INSERT INTO financial_transaction
  (transaction_type, category, description, amount, currency, transaction_date,
   vehicle_id, auto_created, source_key, tenant_id)
SELECT 'COSTO', 'TAGLIANDO', 'Tagliando Sprinter 2025 - MB Center',
       610.00, 'EUR', '2025-09-25',
       (SELECT id FROM fleet_vehicle WHERE plate='GH123KL' AND tenant_id=5),
       FALSE, 'tag-GH123KL-2025', 5;

INSERT INTO financial_transaction
  (transaction_type, category, description, amount, currency, transaction_date,
   vehicle_id, auto_created, source_key, tenant_id)
SELECT 'COSTO', 'REVISIONE', 'Revisione periodica BMW - Motorizzazione',
       118.00, 'EUR', '2025-03-28',
       (SELECT id FROM fleet_vehicle WHERE plate='CH789XY' AND tenant_id=5),
       FALSE, 'rev-CH789XY-2025', 5;

INSERT INTO financial_transaction
  (transaction_type, category, description, amount, currency, transaction_date,
   vehicle_id, auto_created, source_key, tenant_id)
SELECT 'COSTO', 'MANUTENZIONE_STRAORDINARIA', 'Batteria BMW 12V AGM',
       380.00, 'EUR', '2025-01-16',
       (SELECT id FROM fleet_vehicle WHERE plate='CH789XY' AND tenant_id=5),
       FALSE, 'ext-CH789XY-2025-batteria', 5;

INSERT INTO financial_transaction
  (transaction_type, category, description, amount, currency, transaction_date,
   vehicle_id, auto_created, source_key, tenant_id)
SELECT 'COSTO', 'ASSICURAZIONE', 'Polizza Audi 2025 - Allianz',
       1920.00, 'EUR', '2025-09-26',
       (SELECT id FROM fleet_vehicle WHERE plate='MM456GH' AND tenant_id=5),
       FALSE, 'ins-MM456GH-2025', 5;

-- Carburante (costi ricorrenti 2025)
INSERT INTO financial_transaction
  (transaction_type, category, description, amount, currency, transaction_date,
   vehicle_id, auto_created, source_key, tenant_id)
SELECT 'COSTO', 'CARBURANTE', 'Rifornimento Vito - Q1 2025',
       380.00, 'EUR', '2025-03-31',
       (SELECT id FROM fleet_vehicle WHERE plate='EW451AB' AND tenant_id=5),
       FALSE, 'fuel-EW451AB-Q1-2025', 5;

INSERT INTO financial_transaction
  (transaction_type, category, description, amount, currency, transaction_date,
   vehicle_id, auto_created, source_key, tenant_id)
SELECT 'COSTO', 'CARBURANTE', 'Rifornimento Sprinter - Q1 2025',
       510.00, 'EUR', '2025-03-31',
       (SELECT id FROM fleet_vehicle WHERE plate='GH123KL' AND tenant_id=5),
       FALSE, 'fuel-GH123KL-Q1-2025', 5;

INSERT INTO financial_transaction
  (transaction_type, category, description, amount, currency, transaction_date,
   vehicle_id, auto_created, source_key, tenant_id)
SELECT 'COSTO', 'CARBURANTE', 'Rifornimento Vito - Q2 2025',
       420.00, 'EUR', '2025-06-30',
       (SELECT id FROM fleet_vehicle WHERE plate='EW451AB' AND tenant_id=5),
       FALSE, 'fuel-EW451AB-Q2-2025', 5;

INSERT INTO financial_transaction
  (transaction_type, category, description, amount, currency, transaction_date,
   vehicle_id, auto_created, source_key, tenant_id)
SELECT 'COSTO', 'CARBURANTE', 'Rifornimento Sprinter - Q3 2025',
       490.00, 'EUR', '2025-09-30',
       (SELECT id FROM fleet_vehicle WHERE plate='GH123KL' AND tenant_id=5),
       FALSE, 'fuel-GH123KL-Q3-2025', 5;

INSERT INTO financial_transaction
  (transaction_type, category, description, amount, currency, transaction_date,
   vehicle_id, auto_created, source_key, tenant_id)
SELECT 'COSTO', 'CARBURANTE', 'Rifornimento BMW - Q4 2025',
       210.00, 'EUR', '2025-12-31',
       (SELECT id FROM fleet_vehicle WHERE plate='CH789XY' AND tenant_id=5),
       FALSE, 'fuel-CH789XY-Q4-2025', 5;

-- Ricavo 2026 (servizio eseguito)
INSERT INTO financial_transaction
  (transaction_type, category, description, amount, currency, transaction_date,
   service_id, auto_created, source_key, tenant_id)
SELECT 'RICAVO', 'SERVIZIO', 'Pagamento transfer Malpensa - Mr. Chen',
       200.00, 'EUR', '2026-03-05',
       (SELECT id FROM ride_service WHERE internal_booking_reference='LUX-2026-0001' AND tenant_id=5),
       FALSE, 'svc-pay-LUX-2026-0001', 5;

COMMIT;

-- ----------------------------------------------------------------
-- RIEPILOGO
-- ----------------------------------------------------------------
SELECT 'Tenant' AS tipo, business_name AS valore FROM tenant WHERE id=5
UNION ALL
SELECT 'Utenti', CAST(COUNT(*) AS VARCHAR) FROM app_user WHERE tenant_id=5
UNION ALL
SELECT 'Veicoli', CAST(COUNT(*) AS VARCHAR) FROM fleet_vehicle WHERE tenant_id=5
UNION ALL
SELECT 'Piani scadenza', CAST(COUNT(*) AS VARCHAR) FROM fleet_vehicle_deadline_plan WHERE tenant_id=5
UNION ALL
SELECT 'Occorrenze scadenza', CAST(COUNT(*) AS VARCHAR) FROM fleet_vehicle_deadline_occurrence WHERE tenant_id=5
UNION ALL
SELECT 'Servizi', CAST(COUNT(*) AS VARCHAR) FROM ride_service WHERE tenant_id=5
UNION ALL
SELECT 'Transazioni finanziarie', CAST(COUNT(*) AS VARCHAR) FROM financial_transaction WHERE tenant_id=5;
