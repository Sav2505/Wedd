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
