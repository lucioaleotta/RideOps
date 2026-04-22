-- Retrocompatible migration: change external_booking_reference from BIGINT to VARCHAR(100)
-- Existing numeric values are preserved as their string representation via USING cast.
ALTER TABLE ride_service
    ALTER COLUMN external_booking_reference TYPE VARCHAR(100)
    USING external_booking_reference::text;
