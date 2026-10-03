-- Additive migration; preserves existing matches and events.
ALTER TYPE match_status ADD VALUE IF NOT EXISTS 'PLAYING_FIRST_EXTRA_HALF';
ALTER TYPE match_status ADD VALUE IF NOT EXISTS 'PLAYING_SECOND_EXTRA_HALF';
ALTER TYPE match_status ADD VALUE IF NOT EXISTS 'PENALTIES';
ALTER TYPE match_event_type ADD VALUE IF NOT EXISTS 'PENALTY_CONVERTED';
ALTER TYPE match_event_type ADD VALUE IF NOT EXISTS 'PENALTY_MISSED';

BEGIN;
ALTER TABLE match_events ALTER COLUMN minute DROP NOT NULL;
ALTER TABLE match_events DROP CONSTRAINT IF EXISTS chk_match_event_minute;
ALTER TABLE match_events ADD CONSTRAINT chk_match_event_minute CHECK (
    (event_type::text IN ('PENALTY_CONVERTED', 'PENALTY_MISSED') AND minute IS NULL)
    OR
    (event_type::text NOT IN ('PENALTY_CONVERTED', 'PENALTY_MISSED')
        AND minute IS NOT NULL AND minute ~ '^[0-9]+ [12]t(e)?$')
);
COMMIT;
