-- Riallinea la sequence dopo restore o import che abbiano inserito ID espliciti.
SELECT setval(
    pg_get_serial_sequence('ride_service', 'id')::regclass,
    COALESCE(MAX(id), 1),
    COUNT(*) > 0
)
FROM ride_service;
