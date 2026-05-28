-- ============================================================
-- Wedding Management System — Full Migration
-- Run this once to initialise the database from scratch.
-- Usage:
--   psql -U <user> -d <database> -f migrate.sql
-- ============================================================

\echo '==> Running schema.sql...'
\i schema.sql

\echo '==> Running seed.sql...'
\i seed.sql

\echo '==> Migration complete.'
