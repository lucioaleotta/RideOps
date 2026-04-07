-- La colonna `name` è stata sostituita da `business_name` nella migrazione V20.
-- Ora che tutti i dati sono stati migrati, la rimuoviamo.
ALTER TABLE tenant DROP COLUMN IF EXISTS name;
