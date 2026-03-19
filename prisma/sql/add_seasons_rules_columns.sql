DO $$
DECLARE
    seasons_table text;
BEGIN
    IF to_regclass('"SEASONS"') IS NOT NULL THEN
        seasons_table := '"SEASONS"';
    ELSIF to_regclass('seasons') IS NOT NULL THEN
        seasons_table := 'seasons';
    ELSE
        RAISE EXCEPTION 'Table SEASONS/seasons was not found in current schema.';
    END IF;

    EXECUTE format(
        'ALTER TABLE %s
            ADD COLUMN IF NOT EXISTS two_yellows_matches_affected INTEGER NOT NULL DEFAULT 1,
            ADD COLUMN IF NOT EXISTS direct_red_matches_affected INTEGER NOT NULL DEFAULT 1,
            ADD COLUMN IF NOT EXISTS game_number_players INTEGER NOT NULL DEFAULT 11',
        seasons_table
    );

    EXECUTE format(
        'ALTER TABLE %s
            DROP CONSTRAINT IF EXISTS chk_seasons_two_yellows_matches_affected_non_negative,
            DROP CONSTRAINT IF EXISTS chk_seasons_direct_red_matches_affected_non_negative,
            DROP CONSTRAINT IF EXISTS chk_seasons_game_number_players_allowed',
        seasons_table
    );

    EXECUTE format(
        'ALTER TABLE %s
            ADD CONSTRAINT chk_seasons_two_yellows_matches_affected_non_negative
                CHECK (two_yellows_matches_affected >= 0),
            ADD CONSTRAINT chk_seasons_direct_red_matches_affected_non_negative
                CHECK (direct_red_matches_affected >= 0),
            ADD CONSTRAINT chk_seasons_game_number_players_allowed
                CHECK (game_number_players IN (7, 8, 9, 11))',
        seasons_table
    );
END $$;
