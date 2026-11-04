ALTER TABLE ride_service
    ADD COLUMN closed_by_user_id BIGINT NULL,
    ADD COLUMN closed_at TIMESTAMP NULL,
    ADD COLUMN close_mode VARCHAR(40) NULL;

ALTER TABLE ride_service
    ADD CONSTRAINT fk_ride_service_closed_by_user
        FOREIGN KEY (closed_by_user_id) REFERENCES app_user(id);