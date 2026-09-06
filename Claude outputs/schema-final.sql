-- Run this once in Supabase → SQL Editor → New query → Run.
-- This replaces the two smaller files sent earlier - since neither had been
-- run yet, this single script has everything needed in one place. Safe to
-- run even if some of it was already applied (IF NOT EXISTS everywhere).

-- 1) Reporting hierarchy: planner -> manager, manager -> senior manager
--    (same column reused for both hops)
ALTER TABLE coaching_users
  ADD COLUMN IF NOT EXISTS reports_to_id bigint REFERENCES coaching_users(id);

-- 2) Forces a new/reset account through the "set your own password" screen
--    on first login instead of keeping the temporary one.
ALTER TABLE coaching_users
  ADD COLUMN IF NOT EXISTS password_reset_required boolean DEFAULT false;

-- 3) Follow-up chaining: links a new coaching log back to the one it
--    follows up on.
ALTER TABLE coaching_records
  ADD COLUMN IF NOT EXISTS follow_up_of_id bigint REFERENCES coaching_records(id);

-- 4) "Useful Links" feature - Admin-managed links shown on every dashboard,
--    with per-role visibility.
CREATE TABLE IF NOT EXISTS useful_links (
  id bigserial PRIMARY KEY,
  title text NOT NULL,
  url text NOT NULL,
  description text,
  visible_roles text[] NOT NULL DEFAULT '{planner,manager,senior_manager}',
  created_by bigint REFERENCES coaching_users(id),
  created_at timestamptz DEFAULT now()
);

-- 5) IMPORTANT BUG FIX - unrelated to anything above, found while setting
--    up the Admin account: coaching_users.user_id is a leftover column
--    from an earlier version of this app that used Supabase's built-in
--    login system (this app does not - it has its own username/password
--    table). It's still marked NOT NULL and still points at that old
--    system's user table, which no longer applies. Because of this,
--    creating ANY new person through "Add Person" in Manage Team has
--    never actually worked - it was silently guaranteed to fail before
--    today's fix, regardless of what was filled in on the form. This
--    makes the column optional and removes the broken reference so
--    account creation actually works. It does not touch or remove any
--    existing data.
ALTER TABLE coaching_users ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE coaching_users DROP CONSTRAINT IF EXISTS coaching_users_user_id_fkey;
