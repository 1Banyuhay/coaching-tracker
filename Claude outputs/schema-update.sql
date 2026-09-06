-- Run this once in Supabase → SQL Editor → New query → Run.
-- Safe to run even if some of it was already applied (IF NOT EXISTS everywhere).

-- Reporting hierarchy: planner -> manager, manager -> senior manager
-- (same column reused for both hops)
ALTER TABLE coaching_users
  ADD COLUMN IF NOT EXISTS reports_to_id bigint REFERENCES coaching_users(id);

-- Forces a new/reset account through the "set your own password" screen
-- on first login instead of keeping the temporary one.
ALTER TABLE coaching_users
  ADD COLUMN IF NOT EXISTS password_reset_required boolean DEFAULT false;

-- Follow-up chaining: links a new coaching log back to the one it follows up on.
ALTER TABLE coaching_records
  ADD COLUMN IF NOT EXISTS follow_up_of_id bigint REFERENCES coaching_records(id);
