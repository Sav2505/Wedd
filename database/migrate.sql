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

\echo '==> Running migration_014_table_scale_factor.sql...'
\i migration_014_table_scale_factor.sql

\echo '==> Running migration_017_guest_blessings.sql...'
\i migration_017_guest_blessings.sql

\echo '==> Running migration_019_guest_meal_counts.sql...'
\i migration_019_guest_meal_counts.sql

\echo '==> Running migration_021_guest_custom_messages.sql...'
\i migration_021_guest_custom_messages.sql

\echo '==> Running migration_022_paybox_urls.sql...'
\i migration_022_paybox_urls.sql

\echo '==> Running migration_023_paybox_recipient_urls.sql...'
\i migration_023_paybox_recipient_urls.sql

\echo '==> Running migration_024_whatsapp_quota.sql...'
\i migration_024_whatsapp_quota.sql

\echo '==> Running migration_025_whatsapp_group_schedule.sql...'
\i migration_025_whatsapp_group_schedule.sql

\echo '==> Running migration_026_whatsapp_quota_pauses.sql...'
\i migration_026_whatsapp_quota_pauses.sql

\echo '==> Running migration_027_whatsapp_group_deliveries.sql...'
\i migration_027_whatsapp_group_deliveries.sql

\echo '==> Running migration_028_whatsapp_quota_cutover.sql...'
\i migration_028_whatsapp_quota_cutover.sql

\echo '==> Running migration_029_whatsapp_group_schedule_paused_status.sql...'
\i migration_029_whatsapp_group_schedule_paused_status.sql

\echo '==> Running migration_030_table_closed.sql...'
\i migration_030_table_closed.sql

\echo '==> Running migration_031_joined_table.sql...'
\i migration_031_joined_table.sql

\echo '==> Running seed.sql...'
\i seed.sql

\echo '==> Migration complete.'
