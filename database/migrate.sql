-- ============================================================
-- Wedding Management System — Full Migration
-- Run this once to initialise the database from scratch.
-- Usage:
--   psql -U <user> -d <database> -f migrate.sql
-- ============================================================

\echo '==> Running schema.sql...'
\i schema.sql

\echo '==> Running migration_002_couple.sql...'
\i migration_002_couple.sql

\echo '==> Running migration_003_tables.sql...'
\i migration_003_tables.sql

\echo '==> Running migration_004_guest_groups.sql...'
\i migration_004_guest_groups.sql

\echo '==> Running migration_005_table_shapes.sql...'
\i migration_005_table_shapes.sql

\echo '==> Running migration_006_tasks.sql...'
\i migration_006_tasks.sql

\echo '==> Running migration_007_venue_pricing.sql...'
\i migration_007_venue_pricing.sql

\echo '==> Running migration_008_stage_label.sql...'
\i migration_008_stage_label.sql

\echo '==> Running migration_009_photos_binary.sql...'
\i migration_009_photos_binary.sql

\echo '==> Running migration_010_guest_rsvp.sql...'
\i migration_010_guest_rsvp.sql

\echo '==> Running migration_011_wedding_requests_admin_flow.sql...'
\i migration_011_wedding_requests_admin_flow.sql

\echo '==> Running migration_012_whatsapp_scheduling.sql...'
\i migration_012_whatsapp_scheduling.sql

\echo '==> Running seed.sql...'
\i seed.sql

\echo '==> Migration complete.'
