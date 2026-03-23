DO $$
DECLARE
    user_roles_table text;
    seasons_table text;
BEGIN
    IF to_regclass('"USER_ROLES"') IS NOT NULL THEN
        user_roles_table := '"USER_ROLES"';
    ELSIF to_regclass('user_roles') IS NOT NULL THEN
        user_roles_table := 'user_roles';
    ELSE
        RAISE EXCEPTION 'Table USER_ROLES/user_roles was not found in current schema.';
    END IF;

    IF to_regclass('"SEASONS"') IS NOT NULL THEN
        seasons_table := '"SEASONS"';
    ELSIF to_regclass('seasons') IS NOT NULL THEN
        seasons_table := 'seasons';
    ELSE
        RAISE EXCEPTION 'Table SEASONS/seasons was not found in current schema.';
    END IF;

    EXECUTE format(
        'ALTER TABLE %s
            ADD COLUMN IF NOT EXISTS season_id UUID',
        user_roles_table
    );

    EXECUTE format(
        'ALTER TABLE %s
            DROP CONSTRAINT IF EXISTS fk_user_roles_season',
        user_roles_table
    );

    EXECUTE format(
        'ALTER TABLE %s
            ADD CONSTRAINT fk_user_roles_season
                FOREIGN KEY (season_id) REFERENCES %s(id)
                ON UPDATE NO ACTION
                ON DELETE SET NULL',
        user_roles_table,
        seasons_table
    );

    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_user_roles_season
            ON %s (season_id)',
        user_roles_table
    );

    -- NOTE:
    -- We intentionally do not add a hard CHECK constraint here because existing
    -- data may already contain scoped roles (LEAGUE_ADMIN/VOCAL) with NULL season_id.
    -- Authorization is enforced at application level; rows should be backfilled
    -- before adding a strict DB CHECK in a later cleanup migration.
END $$;
