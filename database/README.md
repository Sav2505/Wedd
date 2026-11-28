# Database — Wedding Management System

## Setup

1. Create a PostgreSQL database:
   ```bash
   createdb wedding_db
   ```

2. Run the full migration:
   ```bash
   psql -U postgres -d wedding_db -f database/migrate.sql
   ```

   This runs `schema.sql`, then every numbered migration file, and finally `seed.sql`.

---

## WhatsApp Group Scheduling (In Progress)

Migrations `024` through `029` add the quota ledger, group schedules, delivery
tracking, and a fail-closed cutover. The group scheduler is disabled by default;
do not enable or deploy it until it has been tested against an isolated
PostgreSQL database and a mocked WhatsApp provider.

If migrations `024` and `025` are already installed, apply only `026`, `027`,
`028`, and `029`, in that order. Do not rerun the full migration script or older
migrations. The local UI remains read-only/disabled unless the server is
configured for production sending; do not point a local server with sending
enabled at the production database.

Migration `028` blocks the new sender indefinitely. For the wedding schedule,
the legacy and group workers can now be controlled independently. Deploy the new
server build, replace every old server instance, then set:

```env
WHATSAPP_SCHEDULER_ENABLED=false
GUEST_CUSTOM_MESSAGE_SCHEDULER_ENABLED=false
WHATSAPP_GROUP_SCHEDULER_ENABLED=true
IS_PROD=true
WHATSAPP_TEST_ONLY=false
```

The legacy schedules and custom campaigns stay stopped; the group editor is
available, and the database gate still blocks all WhatsApp sends. Do not leave an
old server instance running: it does not check the quota gate. If manual sends
must also be impossible during replacement, stop the old API or temporarily
remove its WhatsApp credentials until the new build is active.

After the final possible send from an old instance, begin the 24-hour waiting
period by running this once:

```sql
UPDATE whatsapp_quota_settings
SET send_not_before = NOW() + INTERVAL '24 hours'
WHERE id = TRUE;
```

Keep all old senders stopped throughout the waiting period. Use the group editor
to schedule every group that should still receive a message. The invitation
already locked/sent for a wedding must not be scheduled again. The old
`wedding_message_schedule` offsets do not automatically populate group schedules.
At the end of the wait, the group worker can send only the groups explicitly
scheduled in `wedding_whatsapp_group_schedule`. Do not rerun the full migration
or seed for this feature.

---

## PayBox Gift Links (Existing Database)

Before deploying recipient-specific PayBox gift links, manually run only the new migration:

```bash
psql -U <user> -d <database> -f database/migration_023_paybox_recipient_urls.sql
```

It renames the existing `paybox_url` to `bride_paybox_url`, preserving the saved link, and adds nullable `groom_paybox_url`. If both the old and new columns already exist, it copies the old link only when the bride's new link is empty, then clears the obsolete value. The migration is safe to rerun. Do not rerun the full migration or seed for this feature.

## Guest Blessings (Existing Database)

Before deploying the blessings feature, run only the new migration against your existing database:

```bash
psql -U <user> -d <database> -f database/migration_017_guest_blessings.sql
```

Alternatively, run this SQL in your database console:

```sql
ALTER TABLE guests ADD COLUMN IF NOT EXISTS blessing TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS blessing_updated_at TIMESTAMPTZ;
```

Each guest has one editable blessing (up to 2,000 characters). The couple can read blessings only from their own wedding. Do not rerun the full migration or seed just to add these columns.

## Guest Custom WhatsApp Messages (Existing Database)

Before deploying custom, admin-approved WhatsApp messages, run the standalone migration:

```bash
psql -U <user> -d <database> -f database/migration_021_guest_custom_messages.sql
```

The server sends administrator notifications to `WEDFLOW_ADMIN_MAIL`, falling back to `EMAIL_ADMIN`. The minute-level scheduler can be disabled with `GUEST_CUSTOM_MESSAGE_SCHEDULER_ENABLED=false`.

## Guest Meal Counts (Existing Database)

Before deploying the per-meal RSVP counts, run the standalone migration against your existing database:

```bash
psql -U <user> -d <database> -f database/migration_019_guest_meal_counts.sql
```

The migration adds vegetarian and vegan meal quantities, backfills existing single-meal preferences for the saved party size, and leaves `dish_notes` unchanged. Regular meals are calculated from the remaining guest count. Apply the migration before deploying the updated server and client.

---

## Table Closure Status (Existing Database)

Before deploying the table-closure editor, run the standalone migration against
the existing database:

```bash
psql -U <user> -d <database> -f database/migration_030_table_closed.sql
```

It adds `tables.is_closed`, defaulting existing and new tables to `FALSE`. Apply
this migration before deploying the updated server and client. Do not rerun the
full migration or seed for this feature.

## Joined Seating Tables (Existing Database)

Before deploying the joined-table editor, run the standalone migration against
the existing database:

```bash
psql -U <user> -d <database> -f database/migration_031_joined_table.sql
```

It adds the `tables.shape` column when it is missing, defaulting existing and
new tables to `round`, and allows `joined` in the shape constraint. If you have
already applied an earlier version of this migration, run it again to update
the constraint before creating joined tables.

## Tables

| Table          | Purpose                                           |
|----------------|---------------------------------------------------|
| `guests`       | All wedding guests — used for authentication      |
| `photos`       | Guest-uploaded photos (URL references)            |
| `wedding_info` | Single-row wedding config (date, venue, message)  |

---

## Authentication Logic

Login matches:
```sql
SELECT * FROM guests
WHERE full_name = $1
  AND RIGHT(phone, 4) = $2;
```

Where `$2` = last 4 digits entered by the guest.

---

## Example Guests

| Name           | Phone       | Last 4 |
|----------------|-------------|--------|
| אורח אורח      | 0501234567  | 4567   |
| אורחת אורחת    | 0501234567  | 4567   |
