ALTER TABLE app_user
    ADD COLUMN IF NOT EXISTS user_id VARCHAR(80);

WITH normalized AS (
    SELECT
        id,
        LOWER(REGEXP_REPLACE(SPLIT_PART(email, '@', 1), '[^a-zA-Z0-9._-]', '', 'g')) AS base_user_id
    FROM app_user
),
prepared AS (
    SELECT
        id,
        CASE
            WHEN base_user_id IS NULL OR base_user_id = '' THEN CONCAT('user_', id)
            ELSE base_user_id
        END AS candidate_user_id
    FROM normalized
),
numbered AS (
    SELECT
        id,
        candidate_user_id,
        ROW_NUMBER() OVER (PARTITION BY candidate_user_id ORDER BY id) AS rn
    FROM prepared
)
UPDATE app_user u
SET user_id = CASE
    WHEN n.rn = 1 THEN n.candidate_user_id
    ELSE CONCAT(n.candidate_user_id, '_', n.id)
END
FROM numbered n
WHERE u.id = n.id
  AND (u.user_id IS NULL OR u.user_id = '');

ALTER TABLE app_user
    ALTER COLUMN user_id SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uk_app_user_user_id'
    ) THEN
        ALTER TABLE app_user
            ADD CONSTRAINT uk_app_user_user_id UNIQUE (user_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_app_user_user_id ON app_user (user_id);
