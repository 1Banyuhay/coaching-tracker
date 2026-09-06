-- Run this once in Supabase → SQL Editor → New query → Run.
-- Adds the "Useful Links" feature (Admin-managed links shown on every
-- dashboard, with per-role visibility). Safe to run even if part of it
-- was already applied.

CREATE TABLE IF NOT EXISTS useful_links (
  id bigserial PRIMARY KEY,
  title text NOT NULL,
  url text NOT NULL,
  description text,
  -- which roles can see this link: any combination of planner / manager /
  -- senior_manager, chosen by the Admin when adding or editing it.
  visible_roles text[] NOT NULL DEFAULT '{planner,manager,senior_manager}',
  created_by bigint REFERENCES coaching_users(id),
  created_at timestamptz DEFAULT now()
);
