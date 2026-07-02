-- ============================================================
-- Migration 006 — Wedding Tasks & Budget Management
-- Creates the wedding_tasks table for couple-only task/expense tracking.
-- Run: psql -U <user> -d <database> -f migration_006_tasks.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS wedding_tasks (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  task_name      TEXT          NOT NULL,
  supplier_name  TEXT,
  category       TEXT          NOT NULL DEFAULT 'other'
                   CONSTRAINT chk_tasks_category CHECK (category IN (
                     'venue','photographer','dj','dress','suit','rings',
                     'decorations','invitations','transportation','makeup',
                     'hair','rabbi','flowers','food','alcohol','gifts',
                     'design','side_event','hotel','attire','lighting','other'
                   )),
  status         TEXT          NOT NULL DEFAULT 'not_started'
                   CONSTRAINT chk_tasks_status CHECK (status IN (
                     'not_started','in_progress','waiting','completed','cancelled'
                   )),
  deposit        NUMERIC(10,2) NOT NULL DEFAULT 0
                   CONSTRAINT chk_tasks_deposit_nn CHECK (deposit >= 0),
  paid_amount    NUMERIC(10,2) NOT NULL DEFAULT 0
                   CONSTRAINT chk_tasks_paid_nn CHECK (paid_amount >= 0),
  total_amount   NUMERIC(10,2) NOT NULL DEFAULT 0
                   CONSTRAINT chk_tasks_total_nn CHECK (total_amount >= 0),
  due_date       DATE,
  phone          TEXT,
  website        TEXT,
  notes          TEXT,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_by     UUID          REFERENCES guests(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_wedding_tasks_status      ON wedding_tasks(status);
CREATE INDEX IF NOT EXISTS idx_wedding_tasks_category    ON wedding_tasks(category);
CREATE INDEX IF NOT EXISTS idx_wedding_tasks_created_by  ON wedding_tasks(created_by);
